import { getSupabase } from '../supabase'
import { toDataError } from './errors'

import type { LengthUnit, WeightUnit } from '../units'

export type { LengthUnit, WeightUnit } from '../units'

export interface Profile {
  id: string
  displayName: string | null
  weightUnit: WeightUnit
  lengthUnit: LengthUnit
}

export type ProfileUpdate = Partial<Pick<Profile, 'displayName' | 'weightUnit' | 'lengthUnit'>>

interface ProfileRow {
  id: string
  display_name: string | null
  weight_unit: WeightUnit
  length_unit: LengthUnit
}

const COLUMNS = 'id, display_name, weight_unit, length_unit'

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    weightUnit: row.weight_unit,
    lengthUnit: row.length_unit,
  }
}

/** The signed-in user's profile. RLS returns no other row, but filter by ID anyway. */
export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select(COLUMNS)
    .eq('id', userId)
    .maybeSingle<ProfileRow>()
  if (error) throw toDataError(error, 'Could not load your profile.')
  return data ? fromRow(data) : null
}

export async function updateMyProfile(userId: string, update: ProfileUpdate): Promise<Profile> {
  const row: Partial<ProfileRow> = {}
  if (update.displayName !== undefined) row.display_name = update.displayName
  if (update.weightUnit !== undefined) row.weight_unit = update.weightUnit
  if (update.lengthUnit !== undefined) row.length_unit = update.lengthUnit

  const { data, error } = await getSupabase()
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .select(COLUMNS)
    .single<ProfileRow>()
  if (error) throw toDataError(error, 'Could not save your profile.')
  return fromRow(data)
}
