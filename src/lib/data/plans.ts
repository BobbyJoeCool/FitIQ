import { getSupabase } from '../supabase'
import { DataError, toDataError } from './errors'
import type { ExerciseSource } from './exerciseTypes'

/** A reusable routine (plan.md sections 8 and 9.3). */
export interface Plan {
  id: string
  name: string
  description: string | null
  isArchived: boolean
  exerciseCount: number
  updatedAt: string
  /** This plan's default rest in seconds, overriding Settings (FV-11). Null: use Settings. */
  defaultRestSeconds: number | null
}

/** Points at a catalog exercise (dataset ID) or one of the user's own (UUID). */
export interface ExerciseRef {
  source: ExerciseSource
  id: string
}

/** Targets as a workout uses them. A workout's rest is plain seconds (null: no rest timer). */
export interface PlanTargets {
  targetSets: number | null
  /** Text, so it can hold "8-12", "10", "30 s" or "AMRAP". */
  targetReps: string | null
  restSeconds: number | null
  /** Hold or work time per set, for stretches and timed exercises. */
  targetSeconds: number | null
  /** Release time between repeated holds within a set (hold, release, repeat). Needs targetSeconds. */
  targetReleaseSeconds: number | null
  /** The target applies to each side. */
  perSide: boolean
  notes: string | null
}

/**
 * How a plan exercise rests (FV-11): follow the default (the plan's, else
 * Settings), adjust it by restOffsetSeconds, or use a set time (restSeconds).
 */
export type RestMode = 'default' | 'offset' | 'fixed'

/** A plan exercise's targets. restSeconds is the set time, used only when restMode is fixed. */
export interface PlanExerciseTargets extends PlanTargets {
  restMode: RestMode
  restOffsetSeconds: number | null
}

export interface PlanExercise extends PlanExerciseTargets {
  id: string
  planId: string
  exercise: ExerciseRef
  sortOrder: number
}

export interface PlanWithExercises extends Plan {
  exercises: PlanExercise[]
}

export interface PlanInput {
  name: string
  description: string | null
  /** Left out: unchanged on update, none on create. */
  defaultRestSeconds?: number | null
}

export const NO_TARGETS: PlanTargets = {
  targetSets: null,
  targetReps: null,
  restSeconds: null,
  targetSeconds: null,
  targetReleaseSeconds: null,
  perSide: false,
  notes: null,
}

/** A new plan exercise: no targets, resting by the default. */
export const NO_PLAN_TARGETS: PlanExerciseTargets = {
  ...NO_TARGETS,
  restMode: 'default',
  restOffsetSeconds: null,
}

interface PlanRow {
  id: string
  name: string
  description: string | null
  is_archived: boolean
  updated_at: string
  default_rest_seconds: number | null
  workout_plan_exercises?: { count: number }[]
}

interface PlanExerciseRow {
  id: string
  plan_id: string
  catalog_exercise_id: string | null
  custom_exercise_id: string | null
  sort_order: number
  target_sets: number | null
  target_reps: string | null
  rest_seconds: number | null
  rest_mode: RestMode
  rest_offset_seconds: number | null
  target_seconds: number | null
  target_release_seconds: number | null
  per_side: boolean
  notes: string | null
}

const PLAN_COLUMNS = 'id, name, description, is_archived, updated_at, default_rest_seconds'
const PLAN_EXERCISE_COLUMNS =
  'id, plan_id, catalog_exercise_id, custom_exercise_id, sort_order, target_sets, target_reps, rest_seconds, rest_mode, rest_offset_seconds, target_seconds, target_release_seconds, per_side, notes'

function planFromRow(row: PlanRow, exerciseCount = 0): Plan {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isArchived: row.is_archived,
    exerciseCount: row.workout_plan_exercises?.[0]?.count ?? exerciseCount,
    updatedAt: row.updated_at,
    defaultRestSeconds: row.default_rest_seconds,
  }
}

function planExerciseFromRow(row: PlanExerciseRow): PlanExercise {
  return {
    id: row.id,
    planId: row.plan_id,
    exercise: row.custom_exercise_id
      ? { source: 'custom', id: row.custom_exercise_id }
      : { source: 'catalog', id: row.catalog_exercise_id ?? '' },
    sortOrder: row.sort_order,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    restSeconds: row.rest_seconds,
    restMode: row.rest_mode,
    restOffsetSeconds: row.rest_offset_seconds,
    targetSeconds: row.target_seconds,
    targetReleaseSeconds: row.target_release_seconds,
    perSide: row.per_side,
    notes: row.notes,
  }
}

function targetsToRow(targets: PlanExerciseTargets) {
  // Each mode keeps only its own number, matching the table's CHECKs.
  return {
    target_sets: targets.targetSets,
    target_reps: targets.targetReps,
    rest_mode: targets.restMode,
    rest_seconds: targets.restMode === 'fixed' ? (targets.restSeconds ?? 0) : null,
    rest_offset_seconds: targets.restMode === 'offset' ? (targets.restOffsetSeconds ?? 0) : null,
    target_seconds: targets.targetSeconds,
    target_release_seconds: targets.targetSeconds ? targets.targetReleaseSeconds : null,
    per_side: targets.perSide,
    notes: targets.notes,
  }
}

/** An ID that isn't a UUID can't match anything: treat it as not found. */
const isBadId = (error: { code?: string }) => error.code === '22P02'

/** All of the user's plans, archived included, by name, with exercise counts. */
export async function listMyPlans(userId: string): Promise<Plan[]> {
  const { data, error } = await getSupabase()
    .from('workout_plans')
    .select(`${PLAN_COLUMNS}, workout_plan_exercises(count)`)
    .eq('user_id', userId)
    .order('name')
    .returns<PlanRow[]>()
  if (error) throw toDataError(error, 'Could not load your plans.')
  return data.map((row) => planFromRow(row))
}

/** One plan with its exercises in order, or null if it isn't the user's. */
export async function getMyPlan(userId: string, id: string): Promise<PlanWithExercises | null> {
  const supabase = getSupabase()
  const [plan, exercises] = await Promise.all([
    supabase
      .from('workout_plans')
      .select(PLAN_COLUMNS)
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle<PlanRow>(),
    supabase
      .from('workout_plan_exercises')
      .select(PLAN_EXERCISE_COLUMNS)
      .eq('user_id', userId)
      .eq('plan_id', id)
      .order('sort_order')
      .order('created_at')
      .returns<PlanExerciseRow[]>(),
  ])
  const error = plan.error ?? exercises.error
  if (error) {
    if (isBadId(error)) return null
    throw toDataError(error, 'Could not load that plan.')
  }
  if (!plan.data) return null
  const rows = exercises.data ?? []
  return { ...planFromRow(plan.data, rows.length), exercises: rows.map(planExerciseFromRow) }
}

/** user_id is filled in by the database from the session (auth.uid()). */
export async function createPlan(input: PlanInput): Promise<Plan> {
  const { data, error } = await getSupabase()
    .from('workout_plans')
    .insert({
      name: input.name,
      description: input.description,
      default_rest_seconds: input.defaultRestSeconds ?? null,
    })
    .select(PLAN_COLUMNS)
    .single<PlanRow>()
  if (error) throw toDataError(error, 'Could not save the plan.')
  return planFromRow(data)
}

export async function updatePlan(userId: string, id: string, input: PlanInput): Promise<void> {
  const { error } = await getSupabase()
    .from('workout_plans')
    .update({
      name: input.name,
      description: input.description,
      ...(input.defaultRestSeconds !== undefined && {
        default_rest_seconds: input.defaultRestSeconds,
      }),
    })
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw toDataError(error, 'Could not save the plan.')
}

/** Archive rather than delete, so sessions started from it keep their reference. */
export async function setPlanArchived(userId: string, id: string, archived: boolean) {
  const { error } = await getSupabase()
    .from('workout_plans')
    .update({ is_archived: archived })
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw toDataError(error, 'Could not update the plan.')
}

/** Whether any workout (in progress or finished) was started from this plan. */
export async function isPlanUsed(userId: string, planId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .limit(1)
  if (error) throw toDataError(error, 'Could not check the plan.')
  return data.length > 0
}

/**
 * Deletes a plan and its exercises (FV-6). The database allows it only when
 * no workout references the plan; anything else stays archive-only (ADR 0001).
 */
export async function deletePlan(userId: string, id: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from('workout_plans')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')
  if (error) throw toDataError(error, 'Could not delete the plan.')
  if (data.length === 0) {
    throw new DataError(
      "This plan has been used in a workout, so it can't be deleted. Archive it instead.",
      'plan_in_use',
    )
  }
}

/** Adds an exercise to the end of a plan. */
export async function addExerciseToPlan(
  userId: string,
  planId: string,
  exercise: ExerciseRef,
  targets: PlanExerciseTargets = NO_PLAN_TARGETS,
): Promise<PlanExercise> {
  const supabase = getSupabase()
  const last = await supabase
    .from('workout_plan_exercises')
    .select('sort_order')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .returns<{ sort_order: number }[]>()
  if (last.error) throw toDataError(last.error, 'Could not add the exercise.')

  const { data, error } = await supabase
    .from('workout_plan_exercises')
    .insert({
      plan_id: planId,
      catalog_exercise_id: exercise.source === 'catalog' ? exercise.id : null,
      custom_exercise_id: exercise.source === 'custom' ? exercise.id : null,
      sort_order: (last.data[0]?.sort_order ?? -1) + 1,
      ...targetsToRow(targets),
    })
    .select(PLAN_EXERCISE_COLUMNS)
    .single<PlanExerciseRow>()
  if (error) throw toDataError(error, 'Could not add the exercise.')
  return planExerciseFromRow(data)
}

export async function updatePlanExercise(
  userId: string,
  id: string,
  targets: PlanExerciseTargets,
): Promise<PlanExercise> {
  const { data, error } = await getSupabase()
    .from('workout_plan_exercises')
    .update(targetsToRow(targets))
    .eq('user_id', userId)
    .eq('id', id)
    .select(PLAN_EXERCISE_COLUMNS)
    .single<PlanExerciseRow>()
  if (error) throw toDataError(error, 'Could not save the targets.')
  return planExerciseFromRow(data)
}

/** Removes an exercise from a plan. Recorded workouts are unaffected. */
export async function removePlanExercise(userId: string, id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('workout_plan_exercises')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw toDataError(error, 'Could not remove the exercise.')
}

/** Saves a new order in one transaction. `ids` lists every exercise in the plan once. */
export async function reorderPlanExercises(planId: string, ids: string[]): Promise<void> {
  const { error } = await getSupabase().rpc('reorder_plan_exercises', {
    p_plan_id: planId,
    p_ids: ids,
  })
  if (error) throw toDataError(error, 'Could not save the new order.')
}

export interface NewPlanExercise {
  exercise: ExerciseRef
  targets: PlanExerciseTargets
}

/** Adds several exercises to the end of a plan in one request, in the order given. */
export async function addExercisesToPlan(
  userId: string,
  planId: string,
  items: NewPlanExercise[],
): Promise<void> {
  if (items.length === 0) return
  const supabase = getSupabase()
  const last = await supabase
    .from('workout_plan_exercises')
    .select('sort_order')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .returns<{ sort_order: number }[]>()
  if (last.error) throw toDataError(last.error, 'Could not add the exercises.')
  const start = (last.data[0]?.sort_order ?? -1) + 1
  const { error } = await supabase.from('workout_plan_exercises').insert(
    items.map((item, index) => ({
      plan_id: planId,
      catalog_exercise_id: item.exercise.source === 'catalog' ? item.exercise.id : null,
      custom_exercise_id: item.exercise.source === 'custom' ? item.exercise.id : null,
      sort_order: start + index,
      ...targetsToRow(item.targets),
    })),
  )
  if (error) throw toDataError(error, 'Could not add the exercises.')
}
