import { describe, expect, it } from 'vitest'
import { NO_TARGETS } from '../../lib/data/plans'
import { exerciseCount, formatRest, formatTargets } from './format'

describe('formatRest', () => {
  it('uses seconds under a minute and m:ss above', () => {
    expect(formatRest(0)).toBe('none')
    expect(formatRest(45)).toBe('45 s')
    expect(formatRest(60)).toBe('1:00')
    expect(formatRest(90)).toBe('1:30')
    expect(formatRest(3600)).toBe('60:00')
  })
})

describe('formatTargets', () => {
  it('combines whatever targets are set', () => {
    expect(formatTargets(NO_TARGETS)).toBeNull()
    expect(
      formatTargets({ ...NO_TARGETS, targetSets: 3, targetReps: '8-12', restSeconds: 90 }),
    ).toBe('3 × 8-12 · Rest 1:30')
    expect(formatTargets({ ...NO_TARGETS, targetSets: 1 })).toBe('1 set')
    expect(formatTargets({ ...NO_TARGETS, targetSets: 4 })).toBe('4 sets')
    expect(formatTargets({ ...NO_TARGETS, targetReps: 'AMRAP' })).toBe('Reps AMRAP')
    expect(formatTargets({ ...NO_TARGETS, restSeconds: 0 })).toBe('Rest none')
  })

  it('counts exercises', () => {
    expect(exerciseCount(0)).toBe('0 exercises')
    expect(exerciseCount(1)).toBe('1 exercise')
  })
})
