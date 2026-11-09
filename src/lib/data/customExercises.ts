import { getSupabase } from '../supabase'
import type { Exercise } from './exerciseTypes'
import { toDataError } from './errors'

/** Fields a user can set on their own exercise. Mirrors the table's CHECKs. */
export interface CustomExerciseInput {
  name: string
  description: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string | null
  difficulty: string | null
  movementType: string | null
  videoUrl: string | null
  videoSourceName: string | null
}

interface CustomExerciseRow {
  id: string
  name: string
  description: string | null
  primary_muscles: string[]
  secondary_muscles: string[]
  equipment: string | null
  difficulty: string | null
  movement_type: string | null
  video_url: string | null
  video_source_name: string | null
  is_archived: boolean
}

const COLUMNS =
  'id, name, description, primary_muscles, secondary_muscles, equipment, difficulty, movement_type, video_url, video_source_name, is_archived'

function fromRow(row: CustomExerciseRow): Exercise {
  return {
    id: row.id,
    source: 'custom',
    name: row.name,
    description: row.description,
    primaryMuscles: row.primary_muscles,
    secondaryMuscles: row.secondary_muscles,
    equipment: row.equipment,
    difficulty: row.difficulty,
    movementType: row.movement_type,
    force: null,
    mechanic: null,
    instructions: [],
    images: [],
    videoUrl: row.video_url,
    videoSourceName: row.video_source_name,
    isArchived: row.is_archived,
  }
}

function toRow(input: CustomExerciseInput) {
  return {
    name: input.name,
    description: input.description,
    primary_muscles: input.primaryMuscles,
    secondary_muscles: input.secondaryMuscles,
    equipment: input.equipment,
    difficulty: input.difficulty,
    movement_type: input.movementType,
    video_url: input.videoUrl,
    video_source_name: input.videoSourceName,
  }
}

/** All of the user's custom exercises, archived included, by name. */
export async function listMyCustomExercises(userId: string): Promise<Exercise[]> {
  const { data, error } = await getSupabase()
    .from('custom_exercises')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('name')
    .returns<CustomExerciseRow[]>()
  if (error) throw toDataError(error, 'Could not load your exercises.')
  return data.map(fromRow)
}

export async function getMyCustomExercise(userId: string, id: string): Promise<Exercise | null> {
  const { data, error } = await getSupabase()
    .from('custom_exercises')
    .select(COLUMNS)
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle<CustomExerciseRow>()
  if (error) {
    // An ID that isn't a UUID can't match anything: treat it as not found.
    if (error.code === '22P02') return null
    throw toDataError(error, 'Could not load that exercise.')
  }
  return data ? fromRow(data) : null
}

/** user_id is filled in by the database from the session (auth.uid()). */
export async function createCustomExercise(input: CustomExerciseInput): Promise<Exercise> {
  const { data, error } = await getSupabase()
    .from('custom_exercises')
    .insert(toRow(input))
    .select(COLUMNS)
    .single<CustomExerciseRow>()
  if (error) throw toDataError(error, 'Could not save the exercise.')
  return fromRow(data)
}

export async function updateCustomExercise(
  userId: string,
  id: string,
  input: CustomExerciseInput,
): Promise<Exercise> {
  const { data, error } = await getSupabase()
    .from('custom_exercises')
    .update(toRow(input))
    .eq('user_id', userId)
    .eq('id', id)
    .select(COLUMNS)
    .single<CustomExerciseRow>()
  if (error) throw toDataError(error, 'Could not save the exercise.')
  return fromRow(data)
}

/** Archive rather than delete, so past sessions keep their reference (plan.md section 8). */
export async function setCustomExerciseArchived(
  userId: string,
  id: string,
  archived: boolean,
): Promise<Exercise> {
  const { data, error } = await getSupabase()
    .from('custom_exercises')
    .update({ is_archived: archived })
    .eq('user_id', userId)
    .eq('id', id)
    .select(COLUMNS)
    .single<CustomExerciseRow>()
  if (error) throw toDataError(error, 'Could not update the exercise.')
  return fromRow(data)
}
