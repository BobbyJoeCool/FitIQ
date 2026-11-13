import { describe, expect, it } from 'vitest'
import { buildTimerSteps, countdownTone, cueForStep, timerSummary } from './timerSteps'

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

describe('cueForStep (FV-14)', () => {
  const cues = (steps: ReturnType<typeof buildTimerSteps>, isStretch = false) =>
    steps.map((s) => cueForStep(s, isStretch))

  it('says Hold, or Stretch for stretches', () => {
    const steps = buildTimerSteps({ seconds: 30, perSide: false, releaseSeconds: null, holds: 1 })
    expect(cues(steps)).toEqual(['Hold'])
    expect(cues(steps, true)).toEqual(['Stretch'])
  })

  it('names each side and the switch', () => {
    expect(
      cues(buildTimerSteps({ seconds: 30, perSide: true, releaseSeconds: null, holds: 1 }), true),
    ).toEqual(['First side', 'Switch', 'Second side'])
  })

  it('counts down the last repeated holds', () => {
    expect(
      cues(buildTimerSteps({ seconds: 10, perSide: false, releaseSeconds: 3, holds: 4 })),
    ).toEqual(['Hold', 'Release', 'Hold', 'Release', 'Two more', 'Release', 'Last one'])
    expect(
      cues(buildTimerSteps({ seconds: 10, perSide: true, releaseSeconds: 3, holds: 2 })),
    ).toEqual(['First side', 'Release', 'Last one', 'Switch', 'Second side', 'Release', 'Last one'])
  })
})

describe('countdownTone (FV-14)', () => {
  it('plays in the last three seconds of steps longer than three seconds', () => {
    expect([5, 4, 3, 2, 1, 0].map((r) => countdownTone(30, r))).toEqual([
      false,
      false,
      true,
      true,
      true,
      false,
    ])
    expect(countdownTone(3, 2)).toBe(false)
  })
})
