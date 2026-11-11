import { describe, expect, it } from 'vitest'
import type { ExercisePerformance, SessionSet } from '../../lib/data'
import {
  exerciseRecords,
  rangeStart,
  seriesChange,
  topWeightPerWorkout,
  weekStart,
  weeklyCounts,
  workoutTotals,
} from './progressMath'

// Wednesday 12 Nov 2026, noon local.
const NOW = new Date(2026, 10, 11, 12, 0, 0)
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).toISOString()

const set = (o: Partial<SessionSet>): SessionSet => ({
  id: 's',
  sessionExerciseId: 'e',
  setNumber: 1,
  reps: null,
  weightValue: null,
  weightUnit: null,
  isBodyweight: false,
  durationSeconds: null,
  distanceValue: null,
  distanceUnit: null,
  notes: null,
  completedAt: '',
  ...o,
})
const perf = (startedAt: string, sets: SessionSet[]): ExercisePerformance => ({
  sessionId: startedAt,
  exerciseName: 'Squat',
  sessionName: 'W',
  startedAt,
  sets,
})

describe('ranges and weeks', () => {
  it('computes range starts', () => {
    expect(rangeStart('all', NOW)).toBeNull()
    expect(Date.parse(rangeStart('30d', NOW)!)).toBe(NOW.getTime() - 30 * 86_400_000)
  })

  it('starts weeks on Monday, local time', () => {
    expect(weekStart(NOW)).toEqual(new Date(2026, 10, 9))
    expect(weekStart(new Date(2026, 10, 15, 23))).toEqual(new Date(2026, 10, 9)) // Sunday
    expect(weekStart(new Date(2026, 10, 16, 0, 30))).toEqual(new Date(2026, 10, 16)) // Monday
  })

  it('counts workouts per week, oldest first, including empty weeks', () => {
    const workouts = [at(2026, 11, 10), at(2026, 11, 9), at(2026, 11, 3), at(2026, 9, 1)]
    const weeks = weeklyCounts(
      workouts.map((startedAt) => ({ startedAt })),
      4,
      NOW,
    )
    expect(weeks.map((w) => w.count)).toEqual([0, 0, 1, 2])
    expect(weeks[3].weekStart).toEqual(new Date(2026, 10, 9))
  })

  it('totals workouts', () => {
    const workouts = [at(2026, 11, 10), at(2026, 11, 2), at(2026, 10, 20), at(2025, 1, 1)].map(
      (startedAt) => ({ startedAt }),
    )
    expect(workoutTotals(workouts, NOW)).toEqual({
      total: 4,
      last30Days: 3,
      thisWeek: 1,
      perWeek: 0.3,
    })
    expect(workoutTotals([], NOW)).toEqual({ total: 0, last30Days: 0, thisWeek: 0, perWeek: 0 })
  })
})

describe('seriesChange', () => {
  it('needs two points', () => {
    expect(seriesChange([])).toBeNull()
    expect(seriesChange([{ date: at(2026, 11, 1), value: 180 }])).toBeNull()
    expect(
      seriesChange([
        { date: at(2026, 11, 1), value: 180 },
        { date: at(2026, 11, 11), value: 178.5 },
      ]),
    ).toEqual({ change: -1.5, days: 10 })
  })
})

describe('exerciseRecords', () => {
  it('finds exact records across units, keeping the first time a tie was reached', () => {
    const records = exerciseRecords(
      [
        perf(at(2026, 11, 1), [
          set({ reps: 5, weightValue: 100, weightUnit: 'kg' }),
          set({ reps: 12, weightValue: 135, weightUnit: 'lb' }),
        ]),
        perf(at(2026, 11, 8), [set({ reps: 3, weightValue: 220.5, weightUnit: 'lb' })]),
      ],
      'lb',
      'mi',
    )
    expect(records.heaviest?.weight).toBeCloseTo(220.5, 5)
    expect(records.heaviest?.date).toBe(at(2026, 11, 8))
    expect(records.mostReps).toEqual({ reps: 12, date: at(2026, 11, 1) })
    expect(records.bestSetVolume?.volume).toBeCloseTo(1620, 5) // 12 × 135
    expect(records.longestHold).toBeUndefined()
  })

  it('counts bodyweight sets for reps but not for weight', () => {
    const records = exerciseRecords(
      [
        perf(at(2026, 11, 1), [
          set({ reps: 15, isBodyweight: true }),
          set({ reps: 6, isBodyweight: true, weightValue: 45, weightUnit: 'lb' }),
        ]),
      ],
      'lb',
      'mi',
    )
    expect(records.mostReps).toEqual({ reps: 15, date: at(2026, 11, 1) })
    expect(records.heaviest).toBeUndefined()
    expect(records.bestSetVolume).toBeUndefined()
  })

  it('records holds and distances, and nothing from empty sets', () => {
    const records = exerciseRecords(
      [
        perf(at(2026, 11, 1), [set({ durationSeconds: 30 }), set({ durationSeconds: 45 })]),
        perf(at(2026, 11, 2), [
          set({ distanceValue: 5, distanceUnit: 'km', durationSeconds: 1500 }),
        ]),
      ],
      'lb',
      'mi',
    )
    expect(records.longestHold).toEqual({ seconds: 1500, date: at(2026, 11, 2) })
    expect(records.longestDistance?.value).toBeCloseTo(3.107, 3)
    expect(records.heaviest).toBeUndefined()
    expect(exerciseRecords([], 'kg', 'km')).toEqual({})
  })

  it('charts the top weight per workout, oldest first', () => {
    expect(
      topWeightPerWorkout(
        [
          perf(at(2026, 11, 8), [set({ reps: 5, weightValue: 60, weightUnit: 'kg' })]),
          perf(at(2026, 11, 1), [
            set({ reps: 5, weightValue: 125, weightUnit: 'lb' }),
            set({ reps: 0, weightValue: 200, weightUnit: 'lb' }),
          ]),
          perf(at(2026, 11, 4), [set({ durationSeconds: 30 })]),
        ],
        'lb',
      ).map((p) => Math.round(p.value)),
    ).toEqual([125, 132])
  })
})
