import { describe, expect, it } from 'vitest'
import { NO_PLAN_TARGETS, NO_TARGETS } from '../../lib/data/plans'
import { describeRest, exerciseCount, formatPlanTargets, formatRest, formatTargets } from './format'

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

describe('hold targets', () => {
  it('formats holds, with each side', () => {
    expect(formatTargets({ ...NO_TARGETS, targetSets: 2, targetSeconds: 30, perSide: true })).toBe(
      '2 × 30 s each side',
    )
    expect(formatTargets({ ...NO_TARGETS, targetSeconds: 90, restSeconds: 0 })).toBe(
      'Hold 1:30 · Rest none',
    )
    expect(formatTargets({ ...NO_TARGETS, targetSets: 3, targetReps: '10', perSide: true })).toBe(
      '3 × 10 each side',
    )
  })

  it('formats repeated holds with a release', () => {
    expect(
      formatTargets({
        ...NO_TARGETS,
        targetSets: 3,
        targetReps: '5',
        targetSeconds: 10,
        targetReleaseSeconds: 5,
        restSeconds: 60,
      }),
    ).toBe('3 × 5 × 10 s hold · Release 5 s · Rest 1:00')
  })
})

describe('describeRest and formatPlanTargets (FV-11)', () => {
  const base = { ...NO_PLAN_TARGETS, targetSets: 3, targetReps: '8-12' }
  it('says where the rest comes from', () => {
    expect(describeRest({ ...base }, 90)).toBe('Rest 1:30 (default)')
    expect(describeRest({ ...base, restMode: 'offset', restOffsetSeconds: 30 }, 90)).toBe(
      'Rest 2:00 (default + 30 s)',
    )
    expect(describeRest({ ...base, restMode: 'offset', restOffsetSeconds: -15 }, 90)).toBe(
      'Rest 1:15 (default − 15 s)',
    )
    expect(describeRest({ ...base, restMode: 'fixed', restSeconds: 45 }, 90)).toBe('Rest 45 s')
    expect(describeRest({ ...base, restMode: 'fixed', restSeconds: 0 }, 90)).toBe('No rest')
  })

  it('says nothing for a default that is off, but flags an offset with no default', () => {
    expect(describeRest({ ...base }, null)).toBeNull()
    expect(describeRest({ ...base, restMode: 'offset', restOffsetSeconds: 30 }, null)).toBe(
      'Rest: default + 30 s (no default set)',
    )
  })

  it('joins the targets and the rest', () => {
    expect(formatPlanTargets(base, 120)).toBe('3 × 8-12 · Rest 2:00 (default)')
    expect(formatPlanTargets(NO_PLAN_TARGETS, null)).toBeNull()
  })
})
