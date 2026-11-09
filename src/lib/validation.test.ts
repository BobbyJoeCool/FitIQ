import { describe, expect, it } from 'vitest'
import { validateCustomExercise, type CustomExerciseForm } from './validation'

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
