import type { MeasurementType } from '../measurementTypes'
import type { LengthUnit, WeightUnit } from '../units'
import { getSupabase } from '../supabase'
import { toDataError } from './errors'

// numeric columns arrive as strings from PostgREST.
const num = (value: number | string) => Number(value)

// ---------------------------------------------------------------------------
// Weigh-ins (step 6.1)
// ---------------------------------------------------------------------------

export interface WeighIn {
  id: string
  recordedAt: string
  value: number
  unit: WeightUnit
  notes: string | null
}

export interface WeighInInput {
  recordedAt: string
  value: number
  unit: WeightUnit
  notes: string | null
}

interface WeighInRow {
  id: string
  recorded_at: string
  weight_value: number | string
  weight_unit: WeightUnit
  notes: string | null
}

const WEIGH_IN_COLUMNS = 'id, recorded_at, weight_value, weight_unit, notes'

const weighInFromRow = (row: WeighInRow): WeighIn => ({
  id: row.id,
  recordedAt: row.recorded_at,
  value: num(row.weight_value),
  unit: row.weight_unit,
  notes: row.notes,
})

const weighInToRow = (input: WeighInInput) => ({
  recorded_at: input.recordedAt,
  weight_value: input.value,
  weight_unit: input.unit,
  notes: input.notes,
})

/** Weigh-ins newest first, one page at a time. */
export async function listWeighIns(
  userId: string,
  page: number,
  pageSize = 20,
): Promise<{ items: WeighIn[]; hasMore: boolean }> {
  const from = page * pageSize
  const { data, error } = await getSupabase()
    .from('weight_history')
    .select(WEIGH_IN_COLUMNS)
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .range(from, from + pageSize)
    .returns<WeighInRow[]>()
  if (error) throw toDataError(error, 'Could not load your weigh-ins.')
  return { items: data.slice(0, pageSize).map(weighInFromRow), hasMore: data.length > pageSize }
}

/** Weigh-ins since `since` (or all), oldest first, for charts. */
export async function getWeighInSeries(userId: string, since: string | null): Promise<WeighIn[]> {
  let query = getSupabase()
    .from('weight_history')
    .select(WEIGH_IN_COLUMNS)
    .eq('user_id', userId)
    .order('recorded_at', { ascending: true })
  if (since) query = query.gte('recorded_at', since)
  const { data, error } = await query.returns<WeighInRow[]>()
  if (error) throw toDataError(error, 'Could not load your weight chart.')
  return data.map(weighInFromRow)
}

export async function getLatestWeighIn(userId: string): Promise<WeighIn | null> {
  const { data, error } = await getSupabase()
    .from('weight_history')
    .select(WEIGH_IN_COLUMNS)
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle<WeighInRow>()
  if (error) throw toDataError(error, 'Could not load your latest weigh-in.')
  return data ? weighInFromRow(data) : null
}

export async function createWeighIn(input: WeighInInput): Promise<WeighIn> {
  const { data, error } = await getSupabase()
    .from('weight_history')
    .insert(weighInToRow(input))
    .select(WEIGH_IN_COLUMNS)
    .single<WeighInRow>()
  if (error) throw toDataError(error, 'Could not save the weigh-in.')
  return weighInFromRow(data)
}

export async function updateWeighIn(
  userId: string,
  id: string,
  input: WeighInInput,
): Promise<WeighIn> {
  const { data, error } = await getSupabase()
    .from('weight_history')
    .update(weighInToRow(input))
    .eq('user_id', userId)
    .eq('id', id)
    .select(WEIGH_IN_COLUMNS)
    .single<WeighInRow>()
  if (error) throw toDataError(error, 'Could not save the weigh-in.')
  return weighInFromRow(data)
}

export async function deleteWeighIn(userId: string, id: string) {
  const { error } = await getSupabase()
    .from('weight_history')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw toDataError(error, 'Could not delete the weigh-in.')
}

// ---------------------------------------------------------------------------
// Body measurements (step 6.3)
// ---------------------------------------------------------------------------

export type { MeasurementType } from '../measurementTypes'
export type MeasurementUnit = LengthUnit | '%'

export interface Measurement {
  id: string
  recordedAt: string
  type: MeasurementType
  value: number
  unit: MeasurementUnit
  notes: string | null
}

export interface MeasurementInput {
  recordedAt: string
  type: MeasurementType
  value: number
  unit: MeasurementUnit
  notes: string | null
}

interface MeasurementRow {
  id: string
  recorded_at: string
  measurement_type: MeasurementType
  measurement_value: number | string
  measurement_unit: MeasurementUnit
  notes: string | null
}

const MEASUREMENT_COLUMNS =
  'id, recorded_at, measurement_type, measurement_value, measurement_unit, notes'

const measurementFromRow = (row: MeasurementRow): Measurement => ({
  id: row.id,
  recordedAt: row.recorded_at,
  type: row.measurement_type,
  value: num(row.measurement_value),
  unit: row.measurement_unit,
  notes: row.notes,
})

/** Every measurement, oldest first. Small enough to load at once for 2 to 4 people. */
export async function listMeasurements(userId: string): Promise<Measurement[]> {
  const { data, error } = await getSupabase()
    .from('body_measurements')
    .select(MEASUREMENT_COLUMNS)
    .eq('user_id', userId)
    .order('recorded_at', { ascending: true })
    .returns<MeasurementRow[]>()
  if (error) throw toDataError(error, 'Could not load your measurements.')
  return data.map(measurementFromRow)
}

export async function createMeasurement(input: MeasurementInput): Promise<Measurement> {
  const { data, error } = await getSupabase()
    .from('body_measurements')
    .insert({
      recorded_at: input.recordedAt,
      measurement_type: input.type,
      measurement_value: input.value,
      measurement_unit: input.unit,
      notes: input.notes,
    })
    .select(MEASUREMENT_COLUMNS)
    .single<MeasurementRow>()
  if (error) throw toDataError(error, 'Could not save the measurement.')
  return measurementFromRow(data)
}

export async function deleteMeasurement(userId: string, id: string) {
  const { error } = await getSupabase()
    .from('body_measurements')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw toDataError(error, 'Could not delete the measurement.')
}

// ---------------------------------------------------------------------------
// Workout progress (step 6.4)
// ---------------------------------------------------------------------------

export interface FinishedWorkout {
  id: string
  planId: string | null
  startedAt: string
  completedAt: string
}

/** Every finished workout's dates (just the columns the frequency views need). */
export async function listFinishedWorkoutDates(userId: string): Promise<FinishedWorkout[]> {
  const { data, error } = await getSupabase()
    .from('workout_sessions')
    .select('id, plan_id, started_at, completed_at')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })
    .returns<{ id: string; plan_id: string | null; started_at: string; completed_at: string }[]>()
  if (error) throw toDataError(error, 'Could not load your workouts.')
  return data.map((r) => ({
    id: r.id,
    planId: r.plan_id,
    startedAt: r.started_at,
    completedAt: r.completed_at,
  }))
}

export interface ExerciseDone {
  source: 'catalog' | 'custom'
  id: string
  name: string
  timesDone: number
  lastDone: string
}

/** Each exercise the user has logged sets for in a finished workout. */
export async function listExercisesDone(userId: string): Promise<ExerciseDone[]> {
  const { data, error } = await getSupabase()
    .from('workout_session_exercises')
    .select(
      'catalog_exercise_id, custom_exercise_id, exercise_name, workout_sessions!inner(started_at, completed_at), workout_sets!inner(id)',
    )
    .eq('user_id', userId)
    .not('workout_sessions.completed_at', 'is', null)
    .returns<
      {
        catalog_exercise_id: string | null
        custom_exercise_id: string | null
        exercise_name: string
        workout_sessions: { started_at: string }
      }[]
    >()
  if (error) throw toDataError(error, 'Could not load your exercises.')
  const byKey = new Map<string, ExerciseDone>()
  for (const row of data) {
    const source = row.custom_exercise_id ? 'custom' : 'catalog'
    const id = row.custom_exercise_id ?? row.catalog_exercise_id ?? ''
    const key = `${source}:${id}`
    const when = row.workout_sessions.started_at
    const current = byKey.get(key)
    if (!current)
      byKey.set(key, { source, id, name: row.exercise_name, timesDone: 1, lastDone: when })
    else {
      current.timesDone += 1
      if (when > current.lastDone) {
        current.lastDone = when
        current.name = row.exercise_name
      }
    }
  }
  return [...byKey.values()].sort((a, b) => b.lastDone.localeCompare(a.lastDone))
}
