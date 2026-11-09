import type { ExercisePerformance, FinishedWorkout } from '../../lib/data'
import { convertDistance, convertWeight, type WeightUnit } from '../../lib/units'

export type RangeKey = '30d' | '90d' | '1y' | 'all'

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '1y', label: '1 year' },
  { key: 'all', label: 'All time' },
]

const DAY = 86_400_000

/** The ISO start of a range, or null for all time. */
export function rangeStart(range: RangeKey, now: Date): string | null {
  const days = { '30d': 30, '90d': 90, '1y': 365, all: 0 }[range]
  return days ? new Date(now.getTime() - days * DAY).toISOString() : null
}

/** Monday 00:00 local time of the week containing `date`. */
export function weekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - offset)
  return d
}

/** Workouts per week for the last `weeks` weeks, oldest first, this week last. */
export function weeklyCounts(
  workouts: Pick<FinishedWorkout, 'startedAt'>[],
  weeks: number,
  now: Date,
): { weekStart: Date; count: number }[] {
  const thisWeek = weekStart(now)
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(thisWeek)
    start.setDate(start.getDate() - 7 * (weeks - 1 - i))
    return { weekStart: start, count: 0 }
  })
  for (const w of workouts) {
    const start = weekStart(new Date(w.startedAt)).getTime()
    const bucket = buckets.find((b) => b.weekStart.getTime() === start)
    if (bucket) bucket.count += 1
  }
  return buckets
}

export interface WorkoutTotals {
  total: number
  last30Days: number
  thisWeek: number
  /** Average per week over the last 12 weeks. */
  perWeek: number
}

export function workoutTotals(
  workouts: Pick<FinishedWorkout, 'startedAt'>[],
  now: Date,
): WorkoutTotals {
  const since30 = now.getTime() - 30 * DAY
  const thisWeek = weekStart(now).getTime()
  const twelve = weeklyCounts(workouts, 12, now)
  return {
    total: workouts.length,
    last30Days: workouts.filter((w) => Date.parse(w.startedAt) >= since30).length,
    thisWeek: workouts.filter((w) => Date.parse(w.startedAt) >= thisWeek).length,
    perWeek: Math.round((twelve.reduce((s, b) => s + b.count, 0) / 12) * 10) / 10,
  }
}

export interface Point {
  date: string
  value: number
}

/** First-to-last change over a series, or null with fewer than two points. */
export function seriesChange(points: Point[]): { change: number; days: number } | null {
  if (points.length < 2) return null
  const first = points[0]
  const last = points[points.length - 1]
  return {
    change: last.value - first.value,
    days: Math.round((Date.parse(last.date) - Date.parse(first.date)) / DAY),
  }
}

export interface ExerciseRecords {
  heaviest?: { weight: number; reps: number; date: string }
  mostReps?: { reps: number; date: string }
  bestSetVolume?: { volume: number; reps: number; weight: number; date: string }
  longestHold?: { seconds: number; date: string }
  longestDistance?: { value: number; date: string }
}

/**
 * Personal records that can be computed exactly from logged sets, with
 * weights and distances converted to the user's units. No estimates (such as
 * a one-rep max): only what was actually done (step 6.4).
 */
export function exerciseRecords(
  performances: ExercisePerformance[],
  unit: WeightUnit,
  distanceUnit: 'mi' | 'km',
): ExerciseRecords {
  const records: ExerciseRecords = {}
  // Oldest first, so a tie keeps the first time it was reached.
  const ordered = [...performances].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  for (const p of ordered) {
    for (const s of p.sets) {
      const date = p.startedAt
      const weight =
        s.weightValue !== null && s.weightUnit
          ? convertWeight(s.weightValue, s.weightUnit, unit)
          : null
      if (weight !== null && weight > 0 && s.reps && s.reps > 0) {
        if (!records.heaviest || weight > records.heaviest.weight + 1e-9) {
          records.heaviest = { weight, reps: s.reps, date }
        }
        const volume = weight * s.reps
        if (!records.bestSetVolume || volume > records.bestSetVolume.volume + 1e-9) {
          records.bestSetVolume = { volume, reps: s.reps, weight, date }
        }
      }
      if (s.reps && (!records.mostReps || s.reps > records.mostReps.reps)) {
        records.mostReps = { reps: s.reps, date }
      }
      if (
        s.durationSeconds &&
        (!records.longestHold || s.durationSeconds > records.longestHold.seconds)
      ) {
        records.longestHold = { seconds: s.durationSeconds, date }
      }
      if (s.distanceValue !== null && s.distanceUnit && s.distanceValue > 0) {
        const value = convertDistance(s.distanceValue, s.distanceUnit, distanceUnit)
        if (!records.longestDistance || value > records.longestDistance.value + 1e-9) {
          records.longestDistance = { value, date }
        }
      }
    }
  }
  return records
}

/** The heaviest weight lifted in each workout, oldest first, for a chart. */
export function topWeightPerWorkout(
  performances: ExercisePerformance[],
  unit: WeightUnit,
): Point[] {
  return performances
    .map((p) => {
      const weights = p.sets
        .filter((s) => s.weightValue !== null && s.weightUnit && (s.reps ?? 0) > 0)
        .map((s) => convertWeight(s.weightValue!, s.weightUnit!, unit))
      return weights.length ? { date: p.startedAt, value: Math.max(...weights) } : null
    })
    .filter((p): p is Point => p !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
}
