import type { Exercise, PlanTargets, SessionSet, SetInput, WorkoutSession } from '../../lib/data'
import { convertWeight, round, type WeightUnit } from '../../lib/units'
import { formatDuration } from '../workout-plans/format'

/** Which inputs a set needs: reps and weight, a timed hold, or cardio time and distance. */
export type SetMode = 'strength' | 'timed' | 'cardio'

export function setModeFor(exercise: Exercise | undefined, targets: PlanTargets): SetMode {
  if (targets.targetSeconds || exercise?.movementType === 'stretching') return 'timed'
  if (exercise?.movementType === 'cardio') return 'cardio'
  return 'strength'
}

/** "8 × 135 lb", "10 reps", "30 s", "1.2 mi · 12:00". Uses the set's own units. */
export function formatSet(set: Pick<SessionSet, keyof SetInput>): string {
  const parts: string[] = []
  const weight =
    set.weightValue !== null && set.weightUnit
      ? `${round(set.weightValue, 2)} ${set.weightUnit}`
      : null
  if (set.reps !== null && weight) parts.push(`${set.reps} × ${weight}`)
  else if (set.reps !== null) parts.push(set.reps === 1 ? '1 rep' : `${set.reps} reps`)
  else if (weight) parts.push(weight)
  if (set.distanceValue !== null && set.distanceUnit)
    parts.push(`${round(set.distanceValue, 2)} ${set.distanceUnit}`)
  if (set.durationSeconds !== null) parts.push(formatDuration(set.durationSeconds))
  return parts.join(' · ')
}

/** "48 min", "1 h 05 min", "under a minute". */
export function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) return 'under a minute'
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

export const secondsBetween = (startIso: string, endIso: string) =>
  Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 1000))

/** "Mon, Nov 9 · 6:30 PM" in the viewer's time zone. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${time}`
}

export interface SessionTotals {
  setCount: number
  exercisesWithSets: number
  skipped: number
  notLogged: number
  /** Sum of reps × weight, converted to `unit`. Only sets with both count. */
  volume: number
  unit: WeightUnit
}

export function sessionTotals(session: WorkoutSession, unit: WeightUnit): SessionTotals {
  let setCount = 0
  let volume = 0
  let exercisesWithSets = 0
  let skipped = 0
  let notLogged = 0
  for (const exercise of session.exercises) {
    if (exercise.sets.length) exercisesWithSets += 1
    else if (exercise.isSkipped) skipped += 1
    else notLogged += 1
    for (const set of exercise.sets) {
      setCount += 1
      if (set.reps && set.weightValue !== null && set.weightUnit) {
        volume += set.reps * convertWeight(set.weightValue, set.weightUnit, unit)
      }
    }
  }
  return { setCount, exercisesWithSets, skipped, notLogged, volume, unit }
}

/** A whole number from a target like "8" or "8-12" (the low end), else null. */
export function repsFromTarget(target: string | null): number | null {
  const match = target?.trim().match(/^(\d{1,4})(\s*[-–]\s*\d{1,4})?$/)
  return match ? Number(match[1]) : null
}

/**
 * Starting values for the next set: the previous set this workout, else the
 * first set last time, else the plan's targets. Weight is in `unit`.
 */
export function nextSetDefaults(
  previous: SessionSet | undefined,
  lastTime: SessionSet[] | undefined,
  targets: PlanTargets,
  unit: WeightUnit,
): SetInput {
  const source = previous ?? lastTime?.[0]
  const weight =
    source?.weightValue !== null && source?.weightValue !== undefined && source.weightUnit
      ? Number(round(convertWeight(source.weightValue, source.weightUnit, unit), 2))
      : null
  return {
    reps: source?.reps ?? repsFromTarget(targets.targetReps),
    weightValue: weight,
    weightUnit: unit,
    durationSeconds: source?.durationSeconds ?? targets.targetSeconds,
    distanceValue: source?.distanceValue ?? null,
    distanceUnit: source?.distanceUnit ?? null,
    notes: null,
  }
}
