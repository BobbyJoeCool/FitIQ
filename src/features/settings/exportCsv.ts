import type { CardioSession, Measurement, WeighIn, WorkoutSession } from '../../lib/data'
import { CARDIO_LABELS } from '../../lib/cardioActivities'
import { toCsv } from '../../lib/csv'
import { MEASUREMENT_LABELS } from '../../lib/entryValidation'

/**
 * CSV files for "Download your data" (step 8.2). Every row carries its own
 * unit, exactly as stored. Times are ISO 8601 in UTC, plus a local date
 * column so a spreadsheet can group by day.
 */
const localDate = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** One row per set; skipped or unlogged exercises get a row with no set. */
export function workoutsCsv(sessions: WorkoutSession[]): string {
  const rows = sessions.flatMap((s) =>
    s.exercises.flatMap((e) => {
      const base = [
        localDate(s.startedAt),
        s.name,
        s.startedAt,
        s.completedAt,
        e.sortOrder + 1,
        e.exerciseName,
      ]
      if (e.sets.length === 0) {
        return [
          [...base, e.isSkipped ? 'skipped' : 'not done', '', '', '', '', '', '', '', '', s.notes],
        ]
      }
      return e.sets.map((set) => [
        ...base,
        'done',
        set.setNumber,
        set.reps,
        set.weightValue,
        set.weightUnit,
        set.durationSeconds,
        set.distanceValue,
        set.distanceUnit,
        set.notes,
        s.notes,
      ])
    }),
  )
  return toCsv(
    [
      'date',
      'workout',
      'started_at_utc',
      'completed_at_utc',
      'exercise_order',
      'exercise',
      'status',
      'set_number',
      'reps',
      'weight',
      'weight_unit',
      'duration_seconds',
      'distance',
      'distance_unit',
      'set_notes',
      'workout_notes',
    ],
    rows,
  )
}

export function weighInsCsv(rows: WeighIn[]): string {
  return toCsv(
    ['date', 'recorded_at_utc', 'weight', 'weight_unit', 'notes'],
    rows.map((w) => [localDate(w.recordedAt), w.recordedAt, w.value, w.unit, w.notes]),
  )
}

export function measurementsCsv(rows: Measurement[]): string {
  return toCsv(
    ['date', 'recorded_at_utc', 'measurement', 'value', 'unit', 'notes'],
    rows.map((m) => [
      localDate(m.recordedAt),
      m.recordedAt,
      MEASUREMENT_LABELS[m.type],
      m.value,
      m.unit,
      m.notes,
    ]),
  )
}

export function cardioCsv(rows: CardioSession[]): string {
  return toCsv(
    [
      'date',
      'started_at_utc',
      'activity',
      'duration_seconds',
      'distance',
      'distance_unit',
      'incline_percent',
      'notes',
    ],
    rows.map((c) => [
      localDate(c.startedAt),
      c.startedAt,
      CARDIO_LABELS[c.activity],
      c.durationSeconds,
      c.distanceValue,
      c.distanceUnit,
      c.incline,
      c.notes,
    ]),
  )
}

/** Saves text as a file through a temporary link. */
export function downloadFile(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const exportFilename = (kind: string, now = new Date()) =>
  `fitiq-${kind}-${localDate(now.toISOString())}.csv`
