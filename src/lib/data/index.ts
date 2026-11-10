/**
 * The data-access layer: every Supabase call in the app lives under this folder.
 * Components and features import from here, never from `lib/supabase`.
 */
export * from './auth'
export * from './catalog'
export * from './customExercises'
export * from './errors'
export * from './exercises'
export * from './exerciseTypes'
export * from './health'
export * from './plans'
export * from './profiles'
export { readSupabaseConfig, type SupabaseConfig } from '../supabase'
