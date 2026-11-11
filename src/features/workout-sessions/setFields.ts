import type { SetInput } from '../../lib/data'
import type { DistanceUnit, WeightUnit } from '../../lib/units'
import type { SetMode } from './workoutMath'

/** The set entry fields, as typed. */
export interface SetFields {
  reps: string
  weight: string
  seconds: string
  minutes: string
  distance: string
  /** The load is body weight; weight is then added weight (optional). */
  bodyweight: boolean
}

const text = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))

export function toFields(input: SetInput): SetFields {
  return {
    reps: text(input.reps),
    weight: text(input.weightValue),
    seconds: text(input.durationSeconds),
    minutes: input.durationSeconds
      ? String(Math.round((input.durationSeconds / 60) * 100) / 100)
      : '',
    distance: text(input.distanceValue),
    bodyweight: input.isBodyweight,
  }
}

const isWhole = (s: string) => /^\d+$/.test(s)
const isDecimal = (s: string) => /^\d+(\.\d{1,2})?$/.test(s)

/** Turns the typed fields into a set, or an error message. Mirrors the workout_sets CHECKs. */
export function parseSet(
  mode: SetMode,
  f: SetFields,
  weightUnit: WeightUnit,
  distanceUnit: DistanceUnit,
  /** Repeated holds: a timed set also records how many holds, as reps. */
  { holdsAsReps = false }: { holdsAsReps?: boolean } = {},
): { ok: true; value: SetInput } | { ok: false; error: string } {
  const reps = f.reps.trim()
  const weight = f.weight.trim()
  const seconds = f.seconds.trim()
  const minutes = f.minutes.trim()
  const distance = f.distance.trim()
  if (reps && !(isWhole(reps) && Number(reps) <= 1000))
    return { ok: false, error: 'Reps must be a whole number up to 1000.' }
  if (weight && !(isDecimal(weight) && Number(weight) <= 2000)) {
    return { ok: false, error: 'Weight must be a number up to 2000, with at most 2 decimals.' }
  }
  if (seconds && !(isWhole(seconds) && Number(seconds) <= 86400)) {
    return { ok: false, error: 'Time must be whole seconds.' }
  }
  if (minutes && !(isDecimal(minutes) && Number(minutes) <= 1440)) {
    return { ok: false, error: 'Time must be minutes, like 12 or 12.5.' }
  }
  if (distance && !(isDecimal(distance) && Number(distance) <= 1000)) {
    return { ok: false, error: 'Distance must be a number up to 1000.' }
  }
  const durationSeconds =
    mode === 'cardio'
      ? minutes
        ? Math.round(Number(minutes) * 60)
        : null
      : seconds
        ? Number(seconds)
        : null
  const value: SetInput = {
    reps: (mode === 'strength' || (mode === 'timed' && holdsAsReps)) && reps ? Number(reps) : null,
    weightValue: mode === 'strength' && weight ? Number(weight) : null,
    weightUnit,
    isBodyweight: mode === 'strength' && f.bodyweight,
    durationSeconds,
    distanceValue: mode === 'cardio' && distance ? Number(distance) : null,
    distanceUnit,
    notes: null,
  }
  if (value.reps === null && value.durationSeconds === null && value.distanceValue === null) {
    return {
      ok: false,
      error:
        mode === 'strength'
          ? 'Enter the reps you did.'
          : mode === 'timed'
            ? 'Enter how long you held it.'
            : 'Enter a time or a distance.',
    }
  }
  return { ok: true, value }
}
