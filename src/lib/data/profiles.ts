import { getSupabase } from '../supabase'
import { toDataError } from './errors'

import type { LengthUnit, WeightUnit } from '../units'

export type { LengthUnit, WeightUnit } from '../units'

export interface Profile {
  id: string
  displayName: string | null
  weightUnit: WeightUnit
  lengthUnit: LengthUnit
  /** Default rest between sets, in seconds, for exercises that follow it (FV-11). Null: off. */
  defaultRestSeconds?: number | null
  /** Set while an account deletion request is pending (step 8.3). */
  deletionRequestedAt?: string | null
}

export type ProfileUpdate = Partial<
  Pick<Profile, 'displayName' | 'weightUnit' | 'lengthUnit' | 'defaultRestSeconds'>
>

interface ProfileRow {
  id: string
  display_name: string | null
  weight_unit: WeightUnit
  length_unit: LengthUnit
  default_rest_seconds: number | null
  deletion_requested_at: string | null
}

const COLUMNS =
  'id, display_name, weight_unit, length_unit, default_rest_seconds, deletion_requested_at'

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    weightUnit: row.weight_unit,
    lengthUnit: row.length_unit,
    defaultRestSeconds: row.default_rest_seconds,
    deletionRequestedAt: row.deletion_requested_at,
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
  if (update.defaultRestSeconds !== undefined) row.default_rest_seconds = update.defaultRestSeconds

  const { data, error } = await getSupabase()
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .select(COLUMNS)
    .single<ProfileRow>()
  if (error) throw toDataError(error, 'Could not save your profile.')
  return fromRow(data)
}

/**
 * Asks the owner to delete this account (or cancels the request). Nothing is
 * deleted here: the owner does that from the dashboard (docs/accounts.md).
 */
export async function setDeletionRequested(userId: string, requested: boolean): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .update({ deletion_requested_at: requested ? new Date().toISOString() : null })
    .eq('id', userId)
    .select(COLUMNS)
    .single<ProfileRow>()
  if (error) throw toDataError(error, 'Could not update your request.')
  return fromRow(data)
}
