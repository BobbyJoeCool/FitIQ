import { describe, expect, it } from 'vitest'
import { buildTimerSteps, timerSummary } from './timerSteps'

const labels = (steps: ReturnType<typeof buildTimerSteps>) =>
  steps.map((s) => `${s.label} ${s.seconds}`)

describe('buildTimerSteps', () => {
  it('is one hold, or one per side with a switch between', () => {
    expect(
      labels(buildTimerSteps({ seconds: 30, perSide: false, releaseSeconds: null, holds: 5 })),
    ).toEqual(['Hold 30'])
    expect(
      labels(buildTimerSteps({ seconds: 30, perSide: true, releaseSeconds: null, holds: 1 })),
    ).toEqual(['First side 30', 'Switch sides 5', 'Second side 30'])
  })

  it('repeats holds with a release between them, but not after the last', () => {
    expect(
      labels(buildTimerSteps({ seconds: 10, perSide: false, releaseSeconds: 5, holds: 3 })),
    ).toEqual([
      'Hold · 1 of 3 10',
      'Release 5',
      'Hold · 2 of 3 10',
      'Release 5',
      'Hold · 3 of 3 10',
    ])
  })

  it('runs every hold on one side, then the other', () => {
    expect(
      labels(buildTimerSteps({ seconds: 10, perSide: true, releaseSeconds: 5, holds: 2 })),
    ).toEqual([
      'First side · 1 of 2 10',
      'Release 5',
      'First side · 2 of 2 10',
      'Switch sides 5',
      'Second side · 1 of 2 10',
      'Release 5',
      'Second side · 2 of 2 10',
    ])
  })
})

describe('timerSummary', () => {
  it('describes the set before it starts', () => {
    expect(timerSummary({ seconds: 30, perSide: true, releaseSeconds: null, holds: 1 })).toBe(
      '30 s each side',
    )
    expect(timerSummary({ seconds: 45, perSide: false, releaseSeconds: null, holds: 1 })).toBe(
      '45 s hold',
    )
    expect(timerSummary({ seconds: 10, perSide: false, releaseSeconds: 5, holds: 5 })).toBe(
      '5 × 10 s hold, 5 s release',
    )
    expect(timerSummary({ seconds: null, perSide: false, releaseSeconds: null, holds: 1 })).toBe(
      'Enter the seconds to start the timer',
    )
  })
})
