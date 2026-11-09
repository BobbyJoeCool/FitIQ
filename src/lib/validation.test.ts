import { describe, expect, it } from 'vitest'
import { NO_TARGETS } from './data/plans'
import {
  targetsToForm,
  validateCustomExercise,
  validatePlan,
  validateTargets,
  type CustomExerciseForm,
} from './validation'

const base: CustomExerciseForm = {
  name: '  Goblet Squat ',
  description: '   ',
  primaryMuscles: ['quadriceps'],
  secondaryMuscles: ['glutes', 'quadriceps'],
  equipment: 'kettlebells',
  difficulty: '',
  movementType: 'strength',
  videoUrl: '',
  videoSourceName: 'ignored without a URL',
}

describe('validateCustomExercise', () => {
  it('normalizes a valid form into the data-layer input', () => {
    const result = validateCustomExercise(base)
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Goblet Squat',
        description: null,
        primaryMuscles: ['quadriceps'],
        secondaryMuscles: ['glutes'],
        equipment: 'kettlebells',
        difficulty: null,
        movementType: 'strength',
        videoUrl: null,
        videoSourceName: null,
      },
    })
  })

  it('mirrors the database CHECK constraints', () => {
    const result = validateCustomExercise({
      ...base,
      name: ' ',
      primaryMuscles: [],
      secondaryMuscles: ['wings'],
      equipment: 'rock',
      difficulty: 'legendary',
      movementType: 'dance',
      description: 'x'.repeat(2001),
      videoUrl: 'javascript:alert(1)',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        [
          'description',
          'difficulty',
          'equipment',
          'movementType',
          'name',
          'primaryMuscles',
          'secondaryMuscles',
          'videoUrl',
        ].sort(),
      )
    }
  })

  it('limits name and URL length like the database', () => {
    const long = validateCustomExercise({
      ...base,
      name: 'x'.repeat(81),
      videoUrl: `https://example.com/${'a'.repeat(500)}`,
    })
    expect(long.ok).toBe(false)
    if (!long.ok) expect(Object.keys(long.errors).sort()).toEqual(['name', 'videoUrl'])
    expect(validateCustomExercise({ ...base, name: 'x'.repeat(80) }).ok).toBe(true)
  })

  it('keeps the video source name only with a video link', () => {
    const result = validateCustomExercise({
      ...base,
      videoUrl: ' https://youtu.be/abcdefghijk ',
      videoSourceName: ' Coach ',
    })
    expect(result.ok && result.value).toMatchObject({
      videoUrl: 'https://youtu.be/abcdefghijk',
      videoSourceName: 'Coach',
    })
  })
})

describe('validatePlan', () => {
  it('trims the name and turns a blank description into null', () => {
    expect(validatePlan({ name: '  Push Day ', description: '  ' })).toEqual({
      ok: true,
      value: { name: 'Push Day', description: null },
    })
  })

  it('mirrors the database CHECK constraints', () => {
    const result = validatePlan({ name: ' ', description: 'x'.repeat(1001) })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.name).toBe('Give the plan a name.')
      expect(result.errors.description).toMatch(/under 1001/)
    }
  })
})

describe('validateTargets', () => {
  it('turns typed text into targets, with blanks as null', () => {
    expect(
      validateTargets({ targetSets: ' 3 ', targetReps: ' 8-12 ', restSeconds: '90', notes: '' }),
    ).toEqual({
      ok: true,
      value: { targetSets: 3, targetReps: '8-12', restSeconds: 90, notes: null },
    })
    expect(validateTargets(targetsToForm(NO_TARGETS))).toEqual({ ok: true, value: NO_TARGETS })
  })

  it('rejects values the database would', () => {
    const result = validateTargets({
      targetSets: '0',
      targetReps: 'x'.repeat(21),
      restSeconds: '1.5',
      notes: 'x'.repeat(501),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        'notes',
        'restSeconds',
        'targetReps',
        'targetSets',
      ])
    }
    expect(validateTargets({ ...targetsToForm(NO_TARGETS), targetSets: '21' }).ok).toBe(false)
    expect(validateTargets({ ...targetsToForm(NO_TARGETS), restSeconds: '3601' }).ok).toBe(false)
    expect(validateTargets({ ...targetsToForm(NO_TARGETS), restSeconds: '0' }).ok).toBe(true)
  })
})
