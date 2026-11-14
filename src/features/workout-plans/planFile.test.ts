import { describe, expect, it } from 'vitest'
import type { PlanWithExercises } from '../../lib/data'
import { NO_PLAN_TARGETS } from '../../lib/data/plans'
import importFormats from '../../../IMPORT-FORMATS.md?raw'
import { LIBRARY, makeExercise } from '../../test/exerciseFixtures'
import { buildPlanFile, parsePlanFile, planFileName, planFileText } from './planFile'

const PLAN: PlanWithExercises = {
  id: 'plan-1',
  name: 'Push Day',
  description: 'Chest and shoulders',
  isArchived: false,
  exerciseCount: 3,
  updatedAt: '2026-11-12T00:00:00Z',
  defaultRestSeconds: 75,
  exercises: [
    {
      ...NO_PLAN_TARGETS,
      id: 'e1',
      planId: 'plan-1',
      sortOrder: 0,
      exercise: { source: 'catalog', id: 'Barbell_Squat' },
      targetSets: 3,
      targetReps: '8-12',
      restMode: 'fixed',
      restSeconds: 90,
    },
    {
      ...NO_PLAN_TARGETS,
      id: 'e2',
      planId: 'plan-1',
      sortOrder: 1,
      exercise: { source: 'catalog', id: 'Hamstring_Stretch' },
      targetSeconds: 30,
      perSide: true,
      restMode: 'offset',
      restOffsetSeconds: -15,
    },
    {
      ...NO_PLAN_TARGETS,
      id: 'e3',
      planId: 'plan-1',
      sortOrder: 2,
      exercise: { source: 'custom', id: LIBRARY[3].id },
      targetSets: 1,
      notes: 'Warm-up',
    },
  ],
}

const file = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({ format: 'fitiq-plan', version: 1, name: 'Legs', exercises: [], ...overrides })

describe('buildPlanFile (FV-15)', () => {
  it('writes the routine only: no IDs, dates or history', () => {
    const built = buildPlanFile(PLAN, LIBRARY)
    expect(built).toMatchObject({
      format: 'fitiq-plan',
      version: 2,
      name: 'Push Day',
      defaultRestSeconds: 75,
    })
    expect(built.exercises[0]).toEqual({
      catalogId: 'Barbell_Squat',
      name: 'Barbell Squat',
      sets: 3,
      reps: '8-12',
      seconds: null,
      releaseSeconds: null,
      perSide: false,
      restSeconds: 90,
      restOffsetSeconds: null,
      notes: null,
    })
    expect(built.exercises[1]).toMatchObject({ restSeconds: null, restOffsetSeconds: -15 })
    expect(built.exercises[2]).toMatchObject({ restSeconds: null, restOffsetSeconds: null })
    expect(built.exercises[2].custom).toMatchObject({
      name: 'Walking Pad Incline Walk',
      primaryMuscles: ['calves'],
      equipment: 'machine',
    })
    const text = planFileText(PLAN, LIBRARY)
    expect(text).not.toContain('plan-1')
    expect(text).not.toContain(LIBRARY[3].id)
    expect(text).not.toContain('2026-11-12')
  })

  it('names the file after the plan', () => {
    expect(planFileName('Push Day!')).toBe('push-day.fitiq-plan.json')
    expect(planFileName('***')).toBe('plan.fitiq-plan.json')
  })
})

describe('parsePlanFile (FV-15)', () => {
  it('round-trips an exported plan, matching your custom exercise by name', () => {
    const result = parsePlanFile(planFileText(PLAN, LIBRARY), LIBRARY)
    if (!result.ok) throw new Error(result.error)
    expect(result.preview.plan).toEqual({
      name: 'Push Day',
      description: 'Chest and shoulders',
      defaultRestSeconds: 75,
    })
    expect(result.preview.items.map((i) => i.kind)).toEqual([
      'catalog',
      'catalog',
      'custom-existing',
    ])
    expect(result.preview.items[1]).toMatchObject({
      targets: {
        ...NO_PLAN_TARGETS,
        targetSeconds: 30,
        perSide: true,
        restMode: 'offset',
        restOffsetSeconds: -15,
      },
    })
    expect(result.preview.items[0]).toMatchObject({
      targets: { restMode: 'fixed', restSeconds: 90 },
    })
    expect(result.preview.items[2]).toMatchObject({ targets: { restMode: 'default' } })
    expect(result.preview.items[2]).toMatchObject({
      ref: { source: 'custom', id: LIBRARY[3].id },
    })
  })

  it('accepts a minimal hand-written file, ignoring unknown fields', () => {
    const result = parsePlanFile(
      file({
        exercises: [{ catalogId: 'Barbell_Squat' }, { catalogId: 'Hamstring_Stretch', reps: 10 }],
        author: 'someone',
      }),
      LIBRARY,
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.preview.items[0]).toMatchObject({ kind: 'catalog', targets: NO_PLAN_TARGETS })
    expect(result.preview.items[1]).toMatchObject({ targets: { targetReps: '10' } })
  })

  it('marks unknown catalog IDs as skipped, and new custom exercises to create once', () => {
    const custom = { name: 'Sled Push', primaryMuscles: ['quadriceps'] }
    const result = parsePlanFile(
      file({
        exercises: [
          { catalogId: 'Not_A_Real_One', name: 'Mystery' },
          { custom },
          { custom: { ...custom, name: ' sled push ' } },
          { custom: { name: 'old band pull', primaryMuscles: ['shoulders'] } },
        ],
      }),
      LIBRARY,
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.preview.items).toMatchObject([
      { kind: 'unknown', name: 'Mystery', catalogId: 'Not_A_Real_One' },
      { kind: 'custom-new', customKey: 'sled push' },
      { kind: 'custom-new', customKey: 'sled push' },
      // An archived custom exercise doesn't match: a new one is made.
      { kind: 'custom-new', customKey: 'old band pull' },
    ])
  })

  it.each([
    ['not json', 'not JSON', "isn't valid JSON"],
    ['wrong format', JSON.stringify({ format: 'other' }), "isn't a FitIQ plan"],
    ['newer version', file({ version: 3 }), 'newer version of FitIQ'],
    [
      'both rest kinds',
      file({ exercises: [{ catalogId: 'Barbell_Squat', restSeconds: 60, restOffsetSeconds: 15 }] }),
      'use one',
    ],
    ['no name', file({ name: ' ', exercises: [{ catalogId: 'Barbell_Squat' }] }), 'name'],
    ['no exercises', file(), 'no exercises'],
    [
      'too many exercises',
      file({ exercises: Array.from({ length: 101 }, () => ({ catalogId: 'Barbell_Squat' })) }),
      'up to 100',
    ],
    [
      'bad sets',
      file({ exercises: [{ catalogId: 'Barbell_Squat', sets: 50 }] }),
      'Exercise 1: Use a whole number from 1 to 20.',
    ],
    [
      'release without a hold',
      file({ exercises: [{ catalogId: 'Barbell_Squat', releaseSeconds: 3 }] }),
      'Set a hold time too',
    ],
    [
      'both kinds',
      file({ exercises: [{ catalogId: 'Barbell_Squat', custom: { name: 'x' } }] }),
      'either "catalogId" or "custom"',
    ],
    [
      'bad custom muscle',
      file({ exercises: [{ custom: { name: 'X', primaryMuscles: ['wings'] } }] }),
      'Pick muscles from the list.',
    ],
    [
      'wrong type',
      file({ exercises: [{ catalogId: 'Barbell_Squat', sets: [3] }] }),
      'number or text',
    ],
    ['nothing importable', file({ exercises: [{ catalogId: 'Nope' }] }), 'None of the'],
  ])('rejects %s', (_, text, message) => {
    const result = parsePlanFile(text, LIBRARY)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain(message)
  })

  it('still imports version 1 files: a rest is a set time, none follows the default', () => {
    const result = parsePlanFile(
      file({
        version: 1,
        exercises: [
          { catalogId: 'Barbell_Squat', restSeconds: 120 },
          { catalogId: 'Plank_X' },
          { catalogId: 'Hamstring_Stretch' },
        ],
      }),
      LIBRARY,
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.preview.plan.defaultRestSeconds).toBeNull()
    expect(result.preview.items[0]).toMatchObject({
      targets: { restMode: 'fixed', restSeconds: 120 },
    })
    expect(result.preview.items[2]).toMatchObject({ targets: { restMode: 'default' } })
  })

  it('rejects files over 200 KB', () => {
    const result = parsePlanFile(file({ description: 'x'.repeat(210_000) }), LIBRARY)
    expect(result).toEqual({ ok: false, error: 'That file is too big for a plan (over 200 KB).' })
  })
})

describe('IMPORT-FORMATS.md plan files (FV-15)', () => {
  it('has plan examples that import cleanly', () => {
    // Only the Plan files section: other import types have their own examples.
    const start = importFormats.indexOf('\n## Plan files')
    expect(start).toBeGreaterThan(-1)
    const next = importFormats.indexOf('\n## ', start + 1)
    const formatDoc = importFormats.slice(start, next === -1 ? undefined : next)
    const examples = [...formatDoc.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1])
    expect(examples.length).toBeGreaterThanOrEqual(2)
    const ids = ['Barbell_Squat', 'Romanian_Deadlift', 'Plank', 'Hamstring_Stretch', 'Pushups']
    const library = ids.map((id) => makeExercise({ id, name: id.replace(/_/g, ' ') }))
    for (const text of examples) {
      const result = parsePlanFile(text, library)
      if (!result.ok) throw new Error(result.error)
      expect(result.preview.items.every((i) => i.kind !== 'unknown')).toBe(true)
    }
  })
})
