import { describe, expect, it } from 'vitest'
import { LIBRARY } from '../../test/exerciseFixtures'
import { EMPTY_FILTERS, filterExercises, hasActiveFilters } from './filterExercises'

const names = (filters: Partial<typeof EMPTY_FILTERS>) =>
  filterExercises(LIBRARY, { ...EMPTY_FILTERS, ...filters }).map((e) => e.name)

describe('filterExercises', () => {
  it('hides archived custom exercises unless asked', () => {
    expect(names({})).not.toContain('Old Band Pull')
    expect(names({ showArchived: true })).toContain('Old Band Pull')
  })

  it('matches every search word anywhere in the name, ignoring case and punctuation', () => {
    expect(names({ query: 'press bench' })).toEqual(['Dumbbell Bench Press'])
    expect(names({ query: 'SQUAT!' })).toEqual(['Barbell Squat'])
    expect(names({ query: 'squat press' })).toEqual([])
  })

  it('matches a muscle in either the primary or the secondary list', () => {
    expect(names({ muscle: 'hamstrings' })).toEqual(['Barbell Squat', 'Hamstring Stretch'])
  })

  it('filters by equipment, movement type, and difficulty', () => {
    expect(names({ equipment: 'dumbbell' })).toEqual(['Dumbbell Bench Press'])
    expect(names({ movementType: 'stretching' })).toEqual(['Hamstring Stretch'])
    expect(names({ difficulty: 'intermediate' })).toEqual(['Dumbbell Bench Press'])
  })

  it('applies all filters together', () => {
    expect(names({ muscle: 'glutes', equipment: 'barbell', query: 'squat' })).toEqual([
      'Barbell Squat',
    ])
    expect(names({ muscle: 'glutes', equipment: 'dumbbell' })).toEqual([])
  })

  it('includes custom exercises in search', () => {
    expect(names({ query: 'walking pad' })).toEqual(['Walking Pad Incline Walk'])
  })
})

describe('hasActiveFilters', () => {
  it('is false only for the empty filter set', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: '  ' })).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, difficulty: 'expert' })).toBe(true)
  })
})
