import type { DistanceUnit, WeightUnit } from '../units'
import { getSupabase } from '../supabase'
import { DataError, toDataError } from './errors'
import type { ExerciseRef, PlanTargets } from './plans'

/** One set as performed. Each keeps its own units. */
export interface SessionSet {
  id: string
  sessionExerciseId: string
  setNumber: number
  reps: number | null
  weightValue: number | null
  weightUnit: WeightUnit | null
  durationSeconds: number | null
  distanceValue: number | null
  distanceUnit: DistanceUnit | null
  notes: string | null
  completedAt: string
}

/** What the user enters for a set. At least one of reps, duration, or distance. */
export interface SetInput {
  reps: number | null
  weightValue: number | null
  weightUnit: WeightUnit | null
  durationSeconds: number | null
  distanceValue: number | null
  distanceUnit: DistanceUnit | null
  notes: string | null
}

export interface SessionExercise {
  id: string
  sessionId: string
  exercise: ExerciseRef
  /** Copied when the workout started, so history reads the same forever. */
  exerciseName: string
  sortOrder: number
  isSkipped: boolean
  /** Copied from the plan when the workout started. */
  targets: PlanTargets
  sets: SessionSet[]
}

export interface WorkoutSession {
  id: string
  name: string
  planId: string | null
  startedAt: string
  completedAt: string | null
  notes: string | null
  exercises: SessionExercise[]
}

export interface SessionSummary {
  id: string
  name: string
  startedAt: string
  completedAt: string | null
  exerciseCount: number
}

interface SetRow {
  id: string
  session_exercise_id: string
  set_number: number
  reps: number | null
  weight_value: number | string | null
  weight_unit: WeightUnit | null
  duration_seconds: number | null
  distance_value: number | string | null
  distance_unit: DistanceUnit | null
  notes: string | null
  completed_at: string
}

interface ExerciseRow {
  id: string
  session_id: string
  catalog_exercise_id: string | null
  custom_exercise_id: string | null
  exercise_name: string
  sort_order: number
  is_skipped: boolean
  notes: string | null
  target_sets: number | null
  target_reps: string | null
  target_seconds: number | null
  per_side: boolean
  rest_seconds: number | null
  workout_sets?: SetRow[]
}

interface SessionRow {
  id: string
  name: string
  plan_id: string | null
  started_at: string
  completed_at: string | null
  notes: string | null
  workout_session_exercises?: ExerciseRow[] | { count: number }[]
}

const SET_COLUMNS =
  'id, session_exercise_id, set_number, reps, weight_value, weight_unit, duration_seconds, distance_value, distance_unit, notes, completed_at'
const EXERCISE_COLUMNS =
  'id, session_id, catalog_exercise_id, custom_exercise_id, exercise_name, sort_order, is_skipped, notes, target_sets, target_reps, target_seconds, per_side, rest_seconds'
const SESSION_COLUMNS = 'id, name, plan_id, started_at, completed_at, notes'
const FULL_SESSION = `${SESSION_COLUMNS}, workout_session_exercises(${EXERCISE_COLUMNS}, workout_sets(${SET_COLUMNS}))`

// numeric columns arrive as strings from PostgREST.
const num = (value: number | string | null) => (value === null ? null : Number(value))

function setFromRow(row: SetRow): SessionSet {
  return {
    id: row.id,
    sessionExerciseId: row.session_exercise_id,
    setNumber: row.set_number,
    reps: row.reps,
    weightValue: num(row.weight_value),
    weightUnit: row.weight_unit,
    durationSeconds: row.duration_seconds,
    distanceValue: num(row.distance_value),
    distanceUnit: row.distance_unit,
    notes: row.notes,
    completedAt: row.completed_at,
  }
}

function exerciseFromRow(row: ExerciseRow): SessionExercise {
  return {
    id: row.id,
    sessionId: row.session_id,
    exercise: row.custom_exercise_id
      ? { source: 'custom', id: row.custom_exercise_id }
      : { source: 'catalog', id: row.catalog_exercise_id ?? '' },
    exerciseName: row.exercise_name,
    sortOrder: row.sort_order,
    isSkipped: row.is_skipped,
    targets: {
      targetSets: row.target_sets,
      targetReps: row.target_reps,
      targetSeconds: row.target_seconds,
      perSide: row.per_side,
      restSeconds: row.rest_seconds,
      notes: row.notes,
    },
    sets: (row.workout_sets ?? []).map(setFromRow).sort((a, b) => a.setNumber - b.setNumber),
  }
}

function sessionFromRow(row: SessionRow): WorkoutSession {
  const exercises = (row.workout_session_exercises ?? []) as ExerciseRow[]
  return {
    id: row.id,
    name: row.name,
    planId: row.plan_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    notes: row.notes,
    exercises: exercises.map(exerciseFromRow).sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

function setToRow(input: SetInput) {
  return {
    reps: input.reps,
    weight_value: input.weightValue,
    weight_unit: input.weightValue === null ? null : input.weightUnit,
    duration_seconds: input.durationSeconds,
    distance_value: input.distanceValue,
    distance_unit: input.distanceValue === null ? null : input.distanceUnit,
    notes: input.notes,
  }
}

const isBadId = (error: { code?: string }) => error.code === '22P02'

/** The user's workout in progress, if any (at most one). */
export async function getInProgressSession(userId: string): Promise<WorkoutSession | null> {
  const { data, error } = await getSupabase()
    .from('workout_sessions')
    .select(FULL_SESSION)
    .eq('user_id', userId)
    .is('completed_at', null)
    .maybeSingle<SessionRow>()
  if (error) throw toDataError(error, 'Could not load your workout.')
  return data ? sessionFromRow(data) : null
}

/** One workout with everything performed, or null if it isn't the user's. */
export async function getSession(userId: string, id: string): Promise<WorkoutSession | null> {
  const { data, error } = await getSupabase()
    .from('workout_sessions')
    .select(FULL_SESSION)
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle<SessionRow>()
  if (error) {
    if (isBadId(error)) return null
    throw toDataError(error, 'Could not load that workout.')
  }
  return data ? sessionFromRow(data) : null
}

/**
 * Starts a workout, copying the plan's exercises and targets in one
 * transaction. `catalogNames` maps catalog IDs to names (the catalog isn't in
 * the database).
 */
export async function startWorkout(input: {
  name: string
  planId: string | null
  catalogNames: Record<string, string>
}): Promise<string> {
  const { data, error } = await getSupabase().rpc('start_workout', {
    p_name: input.name,
    p_plan_id: input.planId,
    p_catalog_names: input.catalogNames,
  })
  if (error) {
    if (error.code === '23505') {
      throw new DataError(
        'You already have a workout in progress. Finish or discard it first.',
        error.code,
      )
    }
    throw toDataError(error, 'Could not start the workout.')
  }
  return data as string
}

/** Adds an exercise to the end of a workout in progress. */
export async function addSessionExercise(
  userId: string,
  sessionId: string,
  exercise: ExerciseRef,
  exerciseName: string,
): Promise<SessionExercise> {
  const supabase = getSupabase()
  const last = await supabase
    .from('workout_session_exercises')
    .select('sort_order')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .returns<{ sort_order: number }[]>()
  if (last.error) throw toDataError(last.error, 'Could not add the exercise.')
  const { data, error } = await supabase
    .from('workout_session_exercises')
    .insert({
      session_id: sessionId,
      catalog_exercise_id: exercise.source === 'catalog' ? exercise.id : null,
      custom_exercise_id: exercise.source === 'custom' ? exercise.id : null,
      exercise_name: exerciseName.slice(0, 200),
      sort_order: (last.data[0]?.sort_order ?? -1) + 1,
    })
    .select(EXERCISE_COLUMNS)
    .single<ExerciseRow>()
  if (error) throw toDataError(error, 'Could not add the exercise.')
  return exerciseFromRow(data)
}

export async function setSessionExerciseSkipped(userId: string, id: string, skipped: boolean) {
  const { error } = await getSupabase()
    .from('workout_session_exercises')
    .update({ is_skipped: skipped })
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw toDataError(error, 'Could not update the exercise.')
}

export async function removeSessionExercise(userId: string, id: string) {
  const { error } = await getSupabase()
    .from('workout_session_exercises')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw toDataError(error, 'Could not remove the exercise.')
}

/** Saves a completed set immediately (plan.md section 9.4). */
export async function saveSet(
  sessionExerciseId: string,
  setNumber: number,
  input: SetInput,
): Promise<SessionSet> {
  const { data, error } = await getSupabase()
    .from('workout_sets')
    .insert({ session_exercise_id: sessionExerciseId, set_number: setNumber, ...setToRow(input) })
    .select(SET_COLUMNS)
    .single<SetRow>()
  if (error) throw toDataError(error, 'Could not save the set.')
  return setFromRow(data)
}

export async function updateSet(userId: string, id: string, input: SetInput): Promise<SessionSet> {
  const { data, error } = await getSupabase()
    .from('workout_sets')
    .update(setToRow(input))
    .eq('user_id', userId)
    .eq('id', id)
    .select(SET_COLUMNS)
    .single<SetRow>()
  if (error) throw toDataError(error, 'Could not save the set.')
  return setFromRow(data)
}

export async function deleteSet(userId: string, id: string) {
  const { error } = await getSupabase()
    .from('workout_sets')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw toDataError(error, 'Could not delete the set.')
}

export async function finishSession(userId: string, id: string, notes: string | null) {
  const { error } = await getSupabase()
    .from('workout_sessions')
    .update({ completed_at: new Date().toISOString(), notes })
    .eq('user_id', userId)
    .eq('id', id)
    .select('id')
    .single()
  if (error) throw toDataError(error, 'Could not finish the workout.')
}

/** Deletes a workout and everything in it (ADR 0001). */
export async function deleteSession(userId: string, id: string) {
  const { error } = await getSupabase()
    .from('workout_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw toDataError(error, 'Could not delete the workout.')
}

/** Finished workouts, newest first, one page at a time, selecting only what the list shows. */
export async function listSessions(
  userId: string,
  page: number,
  pageSize = 20,
): Promise<{ items: SessionSummary[]; hasMore: boolean }> {
  const from = page * pageSize
  const { data, error } = await getSupabase()
    .from('workout_sessions')
    .select('id, name, started_at, completed_at, workout_session_exercises(count)')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .range(from, from + pageSize) // one extra row tells us whether there's another page
    .returns<SessionRow[]>()
  if (error) throw toDataError(error, 'Could not load your workouts.')
  const items = data.slice(0, pageSize).map((row) => ({
    id: row.id,
    name: row.name,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    exerciseCount: ((row.workout_session_exercises ?? []) as { count: number }[])[0]?.count ?? 0,
  }))
  return { items, hasMore: data.length > pageSize }
}

/** Every time the user did an exercise in a finished workout, newest first, with its sets. */
export interface ExercisePerformance {
  sessionId: string
  /** The exercise's name as copied into that workout. */
  exerciseName: string
  sessionName: string
  startedAt: string
  sets: SessionSet[]
}

export async function getExerciseHistory(
  userId: string,
  exercise: ExerciseRef,
  limit = 50,
): Promise<ExercisePerformance[]> {
  const column = exercise.source === 'catalog' ? 'catalog_exercise_id' : 'custom_exercise_id'
  const { data, error } = await getSupabase()
    .from('workout_session_exercises')
    .select(
      `id, created_at, exercise_name, workout_sessions!inner(id, name, started_at, completed_at), workout_sets(${SET_COLUMNS})`,
    )
    .eq('user_id', userId)
    .eq(column, exercise.id)
    .not('workout_sessions.completed_at', 'is', null)
    // By the workout's own date, not when the row was written: a back-dated or
    // imported workout must still sort correctly.
    .order('workout_sessions(started_at)', { ascending: false })
    .limit(limit)
    .returns<
      {
        exercise_name: string
        workout_sessions: { id: string; name: string; started_at: string }
        workout_sets: SetRow[]
      }[]
    >()
  if (error) {
    if (isBadId(error)) return []
    throw toDataError(error, 'Could not load the exercise history.')
  }
  return data
    .map((row) => ({
      sessionId: row.workout_sessions.id,
      exerciseName: row.exercise_name,
      sessionName: row.workout_sessions.name,
      startedAt: row.workout_sessions.started_at,
      sets: row.workout_sets.map(setFromRow).sort((a, b) => a.setNumber - b.setNumber),
    }))
    .filter((p) => p.sets.length > 0)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/**
 * Every finished workout with all its exercises and sets, oldest first, for
 * the CSV export (step 8.2). Pages through results, since the API returns at
 * most 1000 rows per request.
 */
export async function listAllFinishedSessions(userId: string): Promise<WorkoutSession[]> {
  const pageSize = 200
  const all: WorkoutSession[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getSupabase()
      .from('workout_sessions')
      .select(FULL_SESSION)
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: true })
      .range(from, from + pageSize - 1)
      .returns<SessionRow[]>()
    if (error) throw toDataError(error, 'Could not export your workouts.')
    all.push(...data.map(sessionFromRow))
    if (data.length < pageSize) return all
  }
}
