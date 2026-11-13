import { describe, expect, it } from 'vitest'
import { NO_PLAN_TARGETS } from './data/plans'
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
    expect(validatePlan({ name: '  Push Day ', description: '  ', defaultRest: '' })).toEqual({
      ok: true,
      value: { name: 'Push Day', description: null, defaultRestSeconds: null },
    })
  })

  it('mirrors the database CHECK constraints', () => {
    const result = validatePlan({ name: ' ', description: 'x'.repeat(1001), defaultRest: '90s' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.name).toBe('Give the plan a name.')
      expect(result.errors.description).toMatch(/under 1001/)
      expect(result.errors.defaultRest).toMatch(/0 to 3600/)
    }
  })

  it('takes an optional default rest for the plan (FV-11)', () => {
    const result = validatePlan({ name: 'Legs', description: '', defaultRest: ' 120 ' })
    expect(result).toMatchObject({ ok: true, value: { defaultRestSeconds: 120 } })
    expect(validatePlan({ name: 'Legs', description: '', defaultRest: '3601' }).ok).toBe(false)
  })
})

describe('validateTargets', () => {
  it('turns typed text into targets, with blanks as null', () => {
    expect(
      validateTargets({
        targetSets: ' 3 ',
        targetReps: ' 8-12 ',
        restMode: 'fixed',
        restSeconds: '90',
        restOffset: '',
        targetSeconds: ' 30 ',
        releaseSeconds: ' 5 ',
        perSide: true,
        notes: '',
      }),
    ).toEqual({
      ok: true,
      value: {
        targetSets: 3,
        targetReps: '8-12',
        restMode: 'fixed',
        restSeconds: 90,
        restOffsetSeconds: null,
        targetSeconds: 30,
        targetReleaseSeconds: 5,
        perSide: true,
        notes: null,
      },
    })
    expect(validateTargets(targetsToForm(NO_PLAN_TARGETS))).toEqual({
      ok: true,
      value: NO_PLAN_TARGETS,
    })
  })

  it('rejects values the database would', () => {
    const result = validateTargets({
      targetSets: '0',
      targetReps: 'x'.repeat(21),
      restMode: 'fixed',
      restSeconds: '1.5',
      restOffset: '',
      targetSeconds: '601',
      releaseSeconds: '0',
      perSide: false,
      notes: 'x'.repeat(501),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        'notes',
        'releaseSeconds',
        'restSeconds',
        'targetReps',
        'targetSeconds',
        'targetSets',
      ])
    }
    expect(validateTargets({ ...targetsToForm(NO_PLAN_TARGETS), targetSets: '21' }).ok).toBe(false)
    const fixed = { ...targetsToForm(NO_PLAN_TARGETS), restMode: 'fixed' as const }
    expect(validateTargets({ ...fixed, restSeconds: '3601' }).ok).toBe(false)
    expect(validateTargets({ ...fixed, restSeconds: '' }).ok).toBe(false)
    expect(validateTargets({ ...fixed, restSeconds: '0' }).ok).toBe(true)
  })

  it('follows, adjusts, or replaces the default rest (FV-11)', () => {
    const form = targetsToForm(NO_PLAN_TARGETS)
    expect(form).toMatchObject({ restMode: 'default', restOffset: '0' })
    // Following the default ignores leftover numbers from the other choices.
    expect(validateTargets({ ...form, restSeconds: '45', restOffset: '+30' })).toMatchObject({
      ok: true,
      value: { restMode: 'default', restSeconds: null, restOffsetSeconds: null },
    })
    const offset = { ...form, restMode: 'offset' as const }
    expect(validateTargets({ ...offset, restOffset: '+30' })).toMatchObject({
      value: { restMode: 'offset', restOffsetSeconds: 30, restSeconds: null },
    })
    expect(validateTargets({ ...offset, restOffset: '−15' })).toMatchObject({
      value: { restOffsetSeconds: -15 },
    })
    expect(validateTargets({ ...offset, restOffset: '' }).ok).toBe(false)
    expect(validateTargets({ ...offset, restOffset: '+3601' }).ok).toBe(false)
    expect(
      targetsToForm({ ...NO_PLAN_TARGETS, restMode: 'offset', restOffsetSeconds: 30 }).restOffset,
    ).toBe('+30')
  })

  it('needs a hold time for a release time', () => {
    const result = validateTargets({ ...targetsToForm(NO_PLAN_TARGETS), releaseSeconds: '5' })
    expect(result).toEqual({
      ok: false,
      errors: { releaseSeconds: 'Set a hold time too: release is the break between holds.' },
    })
  })
})
