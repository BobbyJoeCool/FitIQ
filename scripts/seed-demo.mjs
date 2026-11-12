#!/usr/bin/env node
/**
 * Seeds the demo account with realistic, made-up data (step 9.1).
 *
 *   npm run seed:demo        (reads scripts/demo.env; see scripts/demo.env.example)
 *
 * - Signs in as the demo user with the publishable key, so RLS applies: it can
 *   only ever touch the demo account's own rows.
 * - Refuses to run unless the account's email contains "demo", so it can't be
 *   pointed at a family account by mistake.
 * - Repeatable: deletes the demo user's workouts, weigh-ins, measurements and
 *   cardio, reuses its plans by name, then rebuilds about 8 weeks of history
 *   ending today. A fixed random seed keeps the numbers stable.
 *
 * No real data is used anywhere in this file.
 */
import { createClient } from '@supabase/supabase-js'

const CATALOG_URL =
  'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/dist/exercises.json'
const DAY = 86_400_000

const env = (name) => {
  const value = process.env[name]?.trim()
  if (!value) {
    console.error(
      `Missing ${name}. Copy scripts/demo.env.example to scripts/demo.env and fill it in.`,
    )
    process.exit(2)
  }
  return value
}
const url = env('VITE_SUPABASE_URL')
const key = env('VITE_SUPABASE_PUBLISHABLE_KEY')
const email = env('DEMO_EMAIL')
const password = env('DEMO_PASSWORD')
if (key.startsWith('sb_secret_')) {
  console.error('Use the publishable key: the seed runs with the demo user’s own permissions.')
  process.exit(2)
}
if (!/demo/i.test(email)) {
  console.error(`Refusing to seed ${email}: the demo account's email must contain "demo".`)
  process.exit(2)
}

// Small deterministic PRNG (mulberry32), so every run produces the same history.
let seed = 20261109
const random = () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const jitter = (amount) => (random() - 0.5) * 2 * amount
const round = (value, step) => Math.round(value / step) * step

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const must = (result, what) => {
  if (result.error) {
    console.error(`${what}: ${result.error.message}`)
    process.exit(1)
  }
  return result.data
}

const t = (sets, reps, rest, extra = {}) => ({
  target_sets: sets,
  target_reps: reps,
  // A set time (FV-11): rest_mode must say so when rest_seconds is set.
  rest_mode: rest === null ? 'default' : 'fixed',
  rest_seconds: rest,
  target_seconds: null,
  per_side: false,
  ...extra,
})
const hold = (perSide) => t(1, null, 0, { target_seconds: 30, per_side: perSide })

const PLANS = [
  {
    name: 'Push Day',
    description: 'Chest, shoulders, and triceps.',
    exercises: [
      ['Dumbbell_Bench_Press', t(3, '8-12', 90)],
      ['Pushups', t(3, 'AMRAP', 60)],
      ['Side_Lateral_Raise', t(3, '12', 60)],
      ['Triceps_Pushdown', t(3, '10-12', 60)],
    ],
  },
  {
    name: 'Leg Day',
    description: 'Squat first, while you are fresh.',
    exercises: [
      ['Barbell_Squat', t(3, '5', 120)],
      ['Romanian_Deadlift', t(3, '8', 90)],
      ['Leg_Press', t(3, '10', 90)],
      ['Standing_Calf_Raises', t(3, '15', 45)],
    ],
  },
  {
    name: 'Full-body stretch',
    description:
      'Fourteen gentle static stretches from head to toe. Hold each one for 30 seconds without bouncing.',
    exercises: [
      ['Side_Neck_Stretch', hold(true)],
      ['Elbows_Back', hold(false)],
      ['Shoulder_Stretch', hold(true)],
      ['Triceps_Stretch', hold(true)],
      ['Upper_Back_Stretch', hold(false)],
      ['Standing_Lateral_Stretch', hold(true)],
      ['Calf_Stretch_Hands_Against_Wall', hold(true)],
      ['Kneeling_Hip_Flexor', hold(true)],
      ['On_Your_Side_Quad_Stretch', hold(true)],
      ['Hamstring_Stretch', hold(true)],
      ['Knee_Across_The_Body', hold(true)],
      ['Side_Lying_Groin_Stretch', hold(true)],
      ['Cat_Stretch', hold(false)],
      ['Childs_Pose', hold(false)],
    ],
  },
]

/** Working weights (lb) at the start, and the weekly increase. Null = bodyweight. */
const PROGRESSION = {
  Dumbbell_Bench_Press: [40, 2.5],
  Pushups: [null, 0],
  Side_Lateral_Raise: [15, 0.6],
  Triceps_Pushdown: [40, 2.5],
  Barbell_Squat: [135, 5],
  Romanian_Deadlift: [115, 5],
  Leg_Press: [180, 10],
  Standing_Calf_Raises: [90, 5],
}

async function main() {
  console.log(`Seeding demo data for ${email} at ${url}`)
  const signIn = await db.auth.signInWithPassword({ email, password })
  if (signIn.error) {
    console.error(`Could not sign in as ${email}: ${signIn.error.message}`)
    process.exit(2)
  }
  const userId = signIn.data.user.id

  const catalog = await (await fetch(CATALOG_URL)).json()
  const names = new Map(catalog.map((e) => [e.id, e.name]))
  const missing = PLANS.flatMap((p) => p.exercises.map(([id]) => id)).filter((id) => !names.has(id))
  if (missing.length) {
    console.error(`Not in the pinned catalog: ${missing.join(', ')}`)
    process.exit(1)
  }

  // 1. Profile and a custom exercise (with a video link, to show that feature).
  must(
    await db
      .from('profiles')
      .update({ display_name: 'Demo', weight_unit: 'lb', length_unit: 'in' })
      .eq('id', userId),
    'profile',
  )
  let custom = must(
    await db
      .from('custom_exercises')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'Walking Pad Incline Walk'),
    'custom exercise',
  )[0]
  if (!custom) {
    custom = must(
      await db
        .from('custom_exercises')
        .insert({
          name: 'Walking Pad Incline Walk',
          description: 'Brisk walk on the pad. Raise the incline in the last ten minutes.',
          primary_muscles: ['calves'],
          secondary_muscles: ['glutes', 'hamstrings'],
          equipment: 'machine',
          movement_type: 'cardio',
          difficulty: 'beginner',
        })
        .select('id')
        .single(),
      'create custom exercise',
    )
  }

  // 2. Wipe the history this script recreates (sessions cascade to exercises and sets).
  for (const table of [
    'workout_sessions',
    'weight_history',
    'body_measurements',
    'cardio_sessions',
  ]) {
    must(await db.from(table).delete().eq('user_id', userId), `clear ${table}`)
  }

  // 3. Plans: reuse by name (plans can't be deleted), restore, and replace their exercises.
  const plans = {}
  for (const plan of PLANS) {
    let row = must(
      await db.from('workout_plans').select('id').eq('user_id', userId).eq('name', plan.name),
      'plans',
    )[0]
    if (row) {
      must(
        await db
          .from('workout_plans')
          .update({ description: plan.description, is_archived: false })
          .eq('id', row.id),
        'update plan',
      )
      must(await db.from('workout_plan_exercises').delete().eq('plan_id', row.id), 'clear plan')
    } else {
      row = must(
        await db
          .from('workout_plans')
          .insert({ name: plan.name, description: plan.description })
          .select('id')
          .single(),
        'create plan',
      )
    }
    must(
      await db.from('workout_plan_exercises').insert(
        plan.exercises.map(([id, targets], i) => ({
          plan_id: row.id,
          catalog_exercise_id: id,
          sort_order: i,
          ...targets,
        })),
      ),
      'plan exercises',
    )
    plans[plan.name] = { id: row.id, ...plan }
  }

  // 4. About 8 weeks of workouts: Push on Mondays, Legs on Wednesdays, a stretch on
  //    some Fridays, with a few skipped days. Weights creep up week by week.
  const today = new Date()
  today.setHours(18, 30, 0, 0)
  const sessions = []
  for (let daysAgo = 56; daysAgo >= 1; daysAgo--) {
    const day = new Date(today.getTime() - daysAgo * DAY)
    const weekday = day.getDay()
    const week = Math.floor((56 - daysAgo) / 7)
    const plan =
      weekday === 1
        ? plans['Push Day']
        : weekday === 3
          ? plans['Leg Day']
          : weekday === 5 && random() < 0.6
            ? plans['Full-body stretch']
            : null
    if (!plan || random() < 0.12) continue
    sessions.push({ plan, day, week })
  }

  const sessionRows = must(
    await db
      .from('workout_sessions')
      .insert(
        sessions.map(({ plan, day }) => {
          const minutes = plan.name === 'Full-body stretch' ? 14 : 45 + Math.round(jitter(10))
          return {
            name: plan.name,
            plan_id: plan.id,
            started_at: day.toISOString(),
            completed_at: new Date(day.getTime() + minutes * 60_000).toISOString(),
            notes: random() < 0.2 ? 'Felt strong today.' : null,
          }
        }),
      )
      .select('id'),
    'sessions',
  )

  const exerciseRows = []
  sessions.forEach(({ plan }, s) => {
    plan.exercises.forEach(([id, targets], i) => {
      exerciseRows.push({
        session_id: sessionRows[s].id,
        catalog_exercise_id: id,
        exercise_name: names.get(id),
        sort_order: i,
        // One skipped exercise now and then, so history shows it.
        is_skipped: plan.name !== 'Full-body stretch' && i === 3 && random() < 0.1,
        ...targets,
      })
    })
  })
  const insertedExercises = must(
    await db
      .from('workout_session_exercises')
      .insert(exerciseRows)
      .select('id, session_id, catalog_exercise_id, is_skipped'),
    'session exercises',
  )

  const weekOf = new Map(sessionRows.map((row, s) => [row.id, sessions[s].week]))
  const sets = []
  for (const ex of insertedExercises) {
    if (ex.is_skipped) continue
    const week = weekOf.get(ex.session_id)
    const id = ex.catalog_exercise_id
    if (!(id in PROGRESSION)) {
      // A stretch: one 30 s hold (each side where it applies).
      sets.push({ session_exercise_id: ex.id, set_number: 1, duration_seconds: 30 })
      continue
    }
    const [start, perWeek] = PROGRESSION[id]
    const baseReps =
      {
        Barbell_Squat: 5,
        Romanian_Deadlift: 8,
        Leg_Press: 10,
        Standing_Calf_Raises: 15,
        Side_Lateral_Raise: 12,
      }[id] ?? 10
    for (let n = 1; n <= 3; n++) {
      const reps =
        id === 'Pushups'
          ? 18 + week - n * 2 + Math.round(jitter(1))
          : baseReps - (n === 3 && random() < 0.4 ? 1 : 0)
      const weight =
        start === null ? null : round(start + perWeek * week, id === 'Side_Lateral_Raise' ? 2.5 : 5)
      sets.push({
        session_exercise_id: ex.id,
        set_number: n,
        reps,
        weight_value: weight,
        weight_unit: weight === null ? null : 'lb',
      })
    }
  }
  for (let i = 0; i < sets.length; i += 500) {
    must(await db.from('workout_sets').insert(sets.slice(i, i + 500)), 'sets')
  }

  // 5. Weigh-ins every two or three days, trending gently down with daily noise.
  const weighIns = []
  for (let daysAgo = 58; daysAgo >= 0; daysAgo -= random() < 0.5 ? 2 : 3) {
    const at = new Date(today.getTime() - daysAgo * DAY)
    at.setHours(7, 15, 0, 0)
    weighIns.push({
      recorded_at: at.toISOString(),
      weight_value: Math.round((186 - (58 - daysAgo) * 0.11 + jitter(0.8)) * 10) / 10,
      weight_unit: 'lb',
    })
  }
  must(await db.from('weight_history').insert(weighIns), 'weigh-ins')

  // 6. Measurements every two weeks.
  const measurements = []
  for (let i = 0; i <= 4; i++) {
    const at = new Date(today.getTime() - (56 - i * 14) * DAY)
    at.setHours(7, 20, 0, 0)
    measurements.push(
      {
        recorded_at: at.toISOString(),
        measurement_type: 'waist',
        measurement_value: 36 - i * 0.4,
        measurement_unit: 'in',
      },
      {
        recorded_at: at.toISOString(),
        measurement_type: 'chest',
        measurement_value: 41 + i * 0.1,
        measurement_unit: 'in',
      },
      {
        recorded_at: at.toISOString(),
        measurement_type: 'body_fat',
        measurement_value: 24.5 - i * 0.5,
        measurement_unit: '%',
      },
    )
  }
  must(await db.from('body_measurements').insert(measurements), 'measurements')

  // 7. Cardio: walking pad on Tuesdays and Thursdays, an occasional weekend run.
  const cardio = []
  for (let daysAgo = 56; daysAgo >= 1; daysAgo--) {
    const day = new Date(today.getTime() - daysAgo * DAY)
    day.setHours(12, 10, 0, 0)
    const weekday = day.getDay()
    if ((weekday === 2 || weekday === 4) && random() < 0.85) {
      const minutes = 30 + Math.round(random() * 3) * 5
      cardio.push({
        activity_type: 'walking_pad',
        started_at: day.toISOString(),
        duration_seconds: minutes * 60,
        distance_value: Math.round(minutes * 0.045 * 100) / 100,
        distance_unit: 'mi',
        incline: Math.round(random() * 3),
      })
    } else if (weekday === 6 && random() < 0.4) {
      cardio.push({
        activity_type: 'run',
        started_at: day.toISOString(),
        duration_seconds: 1800 + Math.round(jitter(240)),
        distance_value: Math.round((3 + jitter(0.4)) * 100) / 100,
        distance_unit: 'mi',
        incline: null,
      })
    }
  }
  must(await db.from('cardio_sessions').insert(cardio), 'cardio')

  await db.auth.signOut()
  console.log(
    `Done: ${PLANS.length} plans, ${sessions.length} workouts, ${sets.length} sets, ${weighIns.length} weigh-ins, ${measurements.length} measurements, ${cardio.length} cardio sessions.`,
  )
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
