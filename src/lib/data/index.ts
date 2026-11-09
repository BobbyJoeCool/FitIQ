/**
 * The data-access layer: every Supabase call in the app lives under this folder.
 * Components and features import from here, never from `lib/supabase`.
 */
export * from './auth'
export * from './errors'
export * from './health'
export * from './profiles'
export { readSupabaseConfig, type SupabaseConfig } from '../supabase'
