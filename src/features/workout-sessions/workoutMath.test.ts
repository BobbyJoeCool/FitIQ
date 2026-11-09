import { describe, expect, it } from 'vitest'
import type { SessionSet, WorkoutSession } from '../../lib/data'
import { NO_TARGETS } from '../../lib/data/plans'
import { makeExercise } from '../../test/exerciseFixtures'
import {
  formatElapsed,
  formatSet,
  nextSetDefaults,
  repsFromTarget,
  secondsBetween,
  sessionTotals,
  setModeFor,
} from './workoutMath'

const set = (overrides: Partial<SessionSet>): SessionSet => ({
  id: 's',
  sessionExerciseId: 'e',
  setNumber: 1,
  reps: null,
  weightValue: null,
  weightUnit: null,
  durationSeconds: null,
  distanceValue: null,
  distanceUnit: null,
  notes: null,
  completedAt: '2026-11-09T10:00:00Z',
  ...overrides,
})

describe('setModeFor', () => {
  it('uses timed for holds and stretches, cardio for cardio, else strength', () => {
    expect(setModeFor(makeExercise(), NO_TARGETS)).toBe('strength')
    expect(setModeFor(makeExercise(), { ...NO_TARGETS, targetSeconds: 30 })).toBe('timed')
    expect(setModeFor(makeExercise({ movementType: 'stretching' }), NO_TARGETS)).toBe('timed')
    expect(setModeFor(makeExercise({ movementType: 'cardio' }), NO_TARGETS)).toBe('cardio')
    expect(setModeFor(undefined, NO_TARGETS)).toBe('strength')
  })
})

describe('formatSet', () => {
  it('shows what was performed in its own units', () => {
    expect(formatSet(set({ reps: 8, weightValue: 135, weightUnit: 'lb' }))).toBe('8 × 135 lb')
    expect(formatSet(set({ reps: 10 }))).toBe('10 reps')
    expect(formatSet(set({ reps: 1 }))).toBe('1 rep')
    expect(formatSet(set({ durationSeconds: 30 }))).toBe('30 s')
    expect(formatSet(set({ distanceValue: 1.25, distanceUnit: 'mi', durationSeconds: 720 }))).toBe(
      '1.25 mi · 12:00',
    )
    expect(formatSet(set({ reps: 5, weightValue: 61.25, weightUnit: 'kg' }))).toBe('5 × 61.25 kg')
  })
})

describe('time', () => {
  it('formats elapsed time', () => {
    expect(formatElapsed(30)).toBe('under a minute')
    expect(formatElapsed(48 * 60)).toBe('48 min')
    expect(formatElapsed(65 * 60)).toBe('1 h 05 min')
    expect(secondsBetween('2026-11-09T10:00:00Z', '2026-11-09T10:45:30Z')).toBe(2730)
    expect(secondsBetween('2026-11-09T10:00:00Z', '2026-11-09T09:00:00Z')).toBe(0)
  })
})

describe('sessionTotals', () => {
  it('counts sets, converts volume, and separates skipped from not logged', () => {
    const session: WorkoutSession = {
      id: 'w',
      name: 'Push',
      planId: null,
      startedAt: '2026-11-09T10:00:00Z',
      completedAt: null,
      notes: null,
      exercises: [
        {
          id: 'e1',
          sessionId: 'w',
          exercise: { source: 'catalog', id: 'A' },
          exerciseName: 'A',
          sortOrder: 0,
          isSkipped: false,
          targets: NO_TARGETS,
          sets: [
            set({ reps: 10, weightValue: 100, weightUnit: 'lb' }),
            set({ reps: 5, weightValue: 50, weightUnit: 'kg' }),
            set({ durationSeconds: 30 }),
          ],
        },
        {
          id: 'e2',
          sessionId: 'w',
          exercise: { source: 'catalog', id: 'B' },
          exerciseName: 'B',
          sortOrder: 1,
          isSkipped: true,
          targets: NO_TARGETS,
          sets: [],
        },
        {
          id: 'e3',
          sessionId: 'w',
          exercise: { source: 'catalog', id: 'C' },
          exerciseName: 'C',
          sortOrder: 2,
          isSkipped: false,
          targets: NO_TARGETS,
          sets: [],
        },
      ],
    }
    const totals = sessionTotals(session, 'lb')
    expect(totals).toMatchObject({ setCount: 3, exercisesWithSets: 1, skipped: 1, notLogged: 1 })
    expect(totals.volume).toBeCloseTo(1000 + 5 * 50 * 2.2046226218, 3)
  })
})

describe('next set defaults', () => {
  it('parses target reps', () => {
    expect(repsFromTarget('8-12')).toBe(8)
    expect(repsFromTarget('10')).toBe(10)
    expect(repsFromTarget('AMRAP')).toBeNull()
    expect(repsFromTarget('30 s')).toBeNull()
    expect(repsFromTarget(null)).toBeNull()
  })

  it('prefers this workout, then last time, then targets, converting weight', () => {
    const targets = { ...NO_TARGETS, targetReps: '8-12', targetSeconds: null }
    expect(nextSetDefaults(undefined, undefined, targets, 'lb')).toMatchObject({
      reps: 8,
      weightValue: null,
      weightUnit: 'lb',
    })
    const lastTime = [set({ reps: 6, weightValue: 60, weightUnit: 'kg' })]
    expect(nextSetDefaults(undefined, lastTime, targets, 'lb')).toMatchObject({
      reps: 6,
      weightValue: 132.28,
    })
    const previous = set({ reps: 9, weightValue: 135, weightUnit: 'lb' })
    expect(nextSetDefaults(previous, lastTime, targets, 'lb')).toMatchObject({
      reps: 9,
      weightValue: 135,
    })
    expect(
      nextSetDefaults(undefined, undefined, { ...NO_TARGETS, targetSeconds: 30 }, 'lb'),
    ).toMatchObject({ durationSeconds: 30, reps: null })
  })
})
