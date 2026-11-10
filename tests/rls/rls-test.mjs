#!/usr/bin/env node
/**
 * Two-account Row Level Security test (plan.md sections 6 and 13).
 *
 * Signs in as two test accounts and checks, for every user-owned table, that
 * neither account can read, update, delete, or insert the other's rows by
 * naming IDs directly, and that a signed-out client sees nothing.
 *
 *   npm run test:rls        (reads tests/rls/.env)
 *
 * Exits non-zero on any leak or setup failure. Run it before every rollout.
 * Uses only the publishable key: it tests what a browser can do.
 *
 * Step 2.6 adds every table from the full schema (2.5) to TABLES.
 * Child tables also get `crossChecks`: pointing your own row at the other
 * user's parent row (plan, exercise) must fail too, which owner-only RLS
 * alone doesn't guarantee.
 */
import { createClient } from '@supabase/supabase-js'

const MARKER = 'rls-test-intrusion'

/** IDs of each user's own rows, filled in by ensureOwnRow: owned[table][userId]. */
const owned = {}
const remember = (table, userId, id) => {
  owned[table] ??= {}
  owned[table][userId] = id
}

/** Return the ID of one of the user's rows in `table`, inserting `row` if there are none. */
async function ensureRow(client, userId, table, row) {
  const { data, error } = await client.from(table).select('id').eq('user_id', userId).limit(1)
  if (error) throw new Error(`${table}: ${error.message}`)
  if (data.length) return remember(table, userId, data[0].id)
  const insert = await client.from(table).insert(row).select('id').single()
  if (insert.error) throw new Error(`${table} insert: ${insert.error.message}`)
  remember(table, userId, insert.data.id)
}

/**
 * One entry per user-owned table, parents before children.
 * - owner: column holding the owning user's ID
 * - intrusion: values for an update attempt on the other user's rows
 * - foreignInsert(otherUserId): a row that claims to belong to the other user
 * - ensureOwnRow(client, userId): make sure the user has at least one row
 * - crossChecks(me, other): optional extra checks for child tables
 */
const TABLES = [
  {
    name: 'profiles',
    owner: 'id',
    intrusion: { display_name: MARKER },
    foreignInsert: (otherUserId) => ({ id: otherUserId }),
    // Profiles are created by a trigger on auth.users, so nothing to insert.
    ensureOwnRow: async () => {},
  },
  {
    name: 'custom_exercises',
    owner: 'user_id',
    intrusion: { name: MARKER },
    foreignInsert: (otherUserId) => ({
      user_id: otherUserId,
      name: MARKER,
      primary_muscles: ['chest'],
    }),
    ensureOwnRow: (client, userId) =>
      ensureRow(client, userId, 'custom_exercises', {
        name: 'RLS test exercise',
        primary_muscles: ['chest'],
        is_archived: true,
      }),
  },
  {
    name: 'workout_plans',
    owner: 'user_id',
    intrusion: { name: MARKER },
    foreignInsert: (otherUserId) => ({ user_id: otherUserId, name: MARKER }),
    ensureOwnRow: (client, userId) =>
      ensureRow(client, userId, 'workout_plans', { name: 'RLS test plan', is_archived: true }),
  },
  {
    name: 'workout_plan_exercises',
    owner: 'user_id',
    intrusion: { notes: MARKER },
    foreignInsert: (otherUserId) => ({
      user_id: otherUserId,
      plan_id: owned.workout_plans[otherUserId],
      catalog_exercise_id: 'Barbell_Squat',
      sort_order: 0,
    }),
    ensureOwnRow: async (client, userId) => {
      const planId = owned.workout_plans[userId]
      const { data, error } = await client
        .from('workout_plan_exercises')
        .select('id')
        .eq('plan_id', planId)
      if (error) throw new Error(`workout_plan_exercises: ${error.message}`)
      if (data.length < 2) {
        // Two rows, one of each exercise kind, so the reorder check means something.
        const insert = await client.from('workout_plan_exercises').insert([
          { plan_id: planId, catalog_exercise_id: 'Barbell_Squat', sort_order: 0 },
          {
            plan_id: planId,
            custom_exercise_id: owned.custom_exercises[userId],
            sort_order: 1,
          },
        ])
        if (insert.error) throw new Error(`workout_plan_exercises insert: ${insert.error.message}`)
      }
    },
    crossChecks: async (me, other) => {
      const tag = `workout_plan_exercises [${me.label} -> ${other.label}]`
      const myPlan = owned.workout_plans[me.id]
      const theirPlan = owned.workout_plans[other.id]
      const theirOrder = async () => {
        const { data, error } = await other.client
          .from('workout_plan_exercises')
          .select('id, sort_order, plan_id')
          .eq('plan_id', theirPlan)
          .order('id')
        if (error) throw new Error(`${other.label} cannot read own plan: ${error.message}`)
        return data
      }
      const before = await theirOrder()

      const intoTheirPlan = await me.client
        .from('workout_plan_exercises')
        .insert({ plan_id: theirPlan, catalog_exercise_id: 'Barbell_Squat', sort_order: 9 })
        .select()
      check(!!intoTheirPlan.error, `${tag} cannot add an exercise to the other user's plan`)

      const theirExercise = await me.client
        .from('workout_plan_exercises')
        .insert({
          plan_id: myPlan,
          custom_exercise_id: owned.custom_exercises[other.id],
          sort_order: 9,
        })
        .select()
      check(!!theirExercise.error, `${tag} cannot use the other user's custom exercise`)

      const mine = await me.client
        .from('workout_plan_exercises')
        .select('id')
        .eq('plan_id', myPlan)
        .limit(1)
        .single()
      const move = await me.client
        .from('workout_plan_exercises')
        .update({ plan_id: theirPlan })
        .eq('id', mine.data?.id)
        .select()
      check(
        !!move.error || move.data.length === 0,
        `${tag} cannot move own exercise into the other user's plan`,
      )

      const reorder = await me.client.rpc('reorder_plan_exercises', {
        p_plan_id: theirPlan,
        p_ids: before.map((row) => row.id).reverse(),
      })
      const after = await theirOrder()
      check(
        !!reorder.error && JSON.stringify(after) === JSON.stringify(before),
        `${tag} cannot reorder the other user's plan`,
      )

      // Clean up anything that leaked so reruns stay meaningful.
      for (const leaked of [intoTheirPlan, theirExercise]) {
        if (!leaked.error && leaked.data?.length) {
          await me.client.from('workout_plan_exercises').delete().eq('id', leaked.data[0].id)
        }
      }
    },
  },
]

const env = (name) => {
  const value = process.env[name]?.trim()
  if (!value) {
    console.error(`Missing ${name}. Copy tests/rls/.env.example to tests/rls/.env and fill it in.`)
    process.exit(2)
  }
  if (/your-project-ref|x{8,}/.test(value)) {
    console.error(`${name} still has the placeholder from .env.example. Fill in tests/rls/.env.`)
    process.exit(2)
  }
  return value
}

const url = env('VITE_SUPABASE_URL')
const key = env('VITE_SUPABASE_PUBLISHABLE_KEY')
if (key.startsWith('sb_secret_')) {
  console.error(
    'Use the publishable key, not a secret key: the test must run with browser privileges.',
  )
  process.exit(2)
}

const newClient = () =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

let failures = 0
const pass = (msg) => console.log(`  PASS  ${msg}`)
const fail = (msg) => {
  failures += 1
  console.log(`  FAIL  ${msg}`)
}
const check = (ok, msg) => (ok ? pass(msg) : fail(msg))

async function signIn(label, email, password) {
  const client = newClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    console.error(`Could not sign in as user ${label} (${email}): ${error?.message ?? 'no user'}`)
    process.exit(2)
  }
  return { label, client, id: data.user.id }
}

async function ownRows(user, table) {
  const { data, error } = await user.client.from(table.name).select('*').eq(table.owner, user.id)
  if (error) throw new Error(`${user.label} cannot read own ${table.name}: ${error.message}`)
  return data
}

async function checkTable(table, me, other) {
  const tag = `${table.name} [${me.label} -> ${other.label}]`

  // Reads
  const mine = await ownRows(me, table)
  check(mine.length > 0, `${tag} can read own rows`)

  const all = await me.client.from(table.name).select('*')
  check(
    !all.error && all.data.every((row) => row[table.owner] === me.id),
    `${tag} select-all returns only own rows`,
  )

  const theirs = await me.client.from(table.name).select('*').eq(table.owner, other.id)
  check(!theirs.error && theirs.data.length === 0, `${tag} cannot read other's rows by ID`)

  // Updates
  const before = await ownRows(other, table)
  const upd = await me.client
    .from(table.name)
    .update(table.intrusion)
    .eq(table.owner, other.id)
    .select()
  check(!!upd.error || upd.data.length === 0, `${tag} update of other's rows changes nothing`)
  const after = await ownRows(other, table)
  check(
    JSON.stringify(after) === JSON.stringify(before),
    `${tag} other's rows are unchanged after the update attempt`,
  )

  // Deletes
  const del = await me.client.from(table.name).delete().eq(table.owner, other.id).select()
  check(!!del.error || del.data.length === 0, `${tag} delete of other's rows removes nothing`)
  const afterDelete = await ownRows(other, table)
  check(
    afterDelete.length === before.length,
    `${tag} other's rows still exist after delete attempt`,
  )

  // Inserts claiming the other user
  const ins = await me.client.from(table.name).insert(table.foreignInsert(other.id)).select()
  check(!!ins.error, `${tag} cannot insert a row owned by the other user`)
  if (!ins.error && ins.data?.length) {
    // Leaked: try to clean up so reruns stay meaningful.
    await me.client.from(table.name).delete().eq(table.owner, other.id)
  }
}

async function checkAnonymous(table) {
  const anon = newClient()
  const { data, error } = await anon.from(table.name).select('*')
  check(!!error || data.length === 0, `${table.name} [signed out] sees no rows`)
}

async function main() {
  console.log(`RLS test against ${url}\n`)
  const a = await signIn('A', env('RLS_USER_A_EMAIL'), env('RLS_USER_A_PASSWORD'))
  const b = await signIn('B', env('RLS_USER_B_EMAIL'), env('RLS_USER_B_PASSWORD'))
  if (a.id === b.id) {
    console.error('Users A and B are the same account. Use two different test accounts.')
    process.exit(2)
  }

  for (const table of TABLES) {
    console.log(table.name)
    await table.ensureOwnRow(a.client, a.id)
    await table.ensureOwnRow(b.client, b.id)
    await checkTable(table, a, b)
    await checkTable(table, b, a)
    if (table.crossChecks) {
      await table.crossChecks(a, b)
      await table.crossChecks(b, a)
    }
    await checkAnonymous(table)
  }

  await a.client.auth.signOut()
  await b.client.auth.signOut()

  console.log(
    failures
      ? `\n${failures} check(s) FAILED: data can leak between accounts.`
      : '\nAll checks passed.',
  )
  process.exit(failures ? 1 : 0)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(2)
})
