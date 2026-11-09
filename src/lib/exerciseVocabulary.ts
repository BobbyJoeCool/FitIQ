/**
 * Exercise vocabularies, taken from Free Exercise DB so custom and catalog
 * exercises filter the same way. Keep in sync with the CHECK constraints in
 * supabase/migrations/20261109000000_custom_exercises.sql.
 */

export const MUSCLES = [
  'abdominals',
  'abductors',
  'adductors',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lower back',
  'middle back',
  'neck',
  'quadriceps',
  'shoulders',
  'traps',
  'triceps',
] as const

export const EQUIPMENT = [
  'bands',
  'barbell',
  'body only',
  'cable',
  'dumbbell',
  'e-z curl bar',
  'exercise ball',
  'foam roll',
  'kettlebells',
  'machine',
  'medicine ball',
  'other',
] as const

/** Free Exercise DB's `category`, shown as "movement type". */
export const MOVEMENT_TYPES = [
  'cardio',
  'olympic weightlifting',
  'plyometrics',
  'powerlifting',
  'strength',
  'stretching',
  'strongman',
] as const

export const DIFFICULTIES = ['beginner', 'intermediate', 'expert'] as const

export type Muscle = (typeof MUSCLES)[number]
export type Equipment = (typeof EQUIPMENT)[number]
export type MovementType = (typeof MOVEMENT_TYPES)[number]
export type Difficulty = (typeof DIFFICULTIES)[number]

/** "lower back" -> "Lower back", "e-z curl bar" -> "E-z curl bar". */
export function vocabLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
