/** One stretch of the hold timer: a hold, a release between holds, or a pause to switch sides. */
export interface TimerStep {
  kind: 'hold' | 'release' | 'switch'
  seconds: number
  label: string
  /** Holds only: which side (per-side sets) and which hold of how many. */
  side?: 'first' | 'second'
  holdNumber?: number
  holdCount?: number
}

/** Seconds to get into position on the other side. */
export const SWITCH_SECONDS = 5

/**
 * The timer's sequence for one set. Without a release time it's a single hold
 * (per side). With one, it repeats the hold `holds` times with a release
 * between them, like the ab roller, then switches sides if per side.
 */
export function buildTimerSteps({
  seconds,
  perSide,
  releaseSeconds,
  holds,
}: {
  seconds: number
  perSide: boolean
  releaseSeconds: number | null
  holds: number
}): TimerStep[] {
  const count = releaseSeconds ? Math.max(1, holds) : 1
  const sides = perSide ? ['First side', 'Second side'] : ['Hold']
  const sideKeys = perSide ? (['first', 'second'] as const) : ([undefined] as const)
  const steps: TimerStep[] = []
  sides.forEach((side, s) => {
    for (let h = 1; h <= count; h += 1) {
      steps.push({
        kind: 'hold',
        seconds,
        label: count > 1 ? `${side} · ${h} of ${count}` : side,
        side: sideKeys[s],
        holdNumber: h,
        holdCount: count,
      })
      if (releaseSeconds && h < count) {
        steps.push({ kind: 'release', seconds: releaseSeconds, label: 'Release' })
      }
    }
    if (s < sides.length - 1) {
      steps.push({ kind: 'switch', seconds: SWITCH_SECONDS, label: 'Switch sides' })
    }
  })
  return steps
}

/** The label before the timer starts: "30 s each side", "5 × 10 s hold, 5 s release". */
export function timerSummary({
  seconds,
  perSide,
  releaseSeconds,
  holds,
}: {
  seconds: number | null
  perSide: boolean
  releaseSeconds: number | null
  holds: number
}): string {
  if (!seconds) return 'Enter the seconds to start the timer'
  const side = perSide ? ' each side' : ''
  if (releaseSeconds) {
    return `${Math.max(1, holds)} × ${seconds} s hold, ${releaseSeconds} s release${side}`
  }
  return perSide ? `${seconds} s each side` : `${seconds} s hold`
}

/** Spoken at the end of the set (FV-14). */
export const DONE_CUE = 'Done'

/**
 * What the voice says as a step starts (FV-14): "Stretch" or "Hold", "First
 * side" / "Second side", "Release", "Switch", and "Two more" / "Last one" near
 * the end of repeated holds.
 */
export function cueForStep(step: TimerStep, isStretch: boolean): string {
  if (step.kind === 'release') return 'Release'
  if (step.kind === 'switch') return 'Switch'
  const word = isStretch ? 'Stretch' : 'Hold'
  const sideWord =
    step.side === 'first' ? 'First side' : step.side === 'second' ? 'Second side' : null
  const n = step.holdNumber ?? 1
  const count = step.holdCount ?? 1
  if (n === 1) return sideWord ?? word
  if (n === count) return 'Last one'
  if (count >= 3 && n === count - 1) return 'Two more'
  return word
}

/**
 * Whether to play a countdown tone (FV-14): in the last three seconds of a
 * step, but not for steps of three seconds or less, where the tones would
 * talk over the spoken cue.
 */
export function countdownTone(stepSeconds: number, remaining: number): boolean {
  return stepSeconds > 3 && remaining >= 1 && remaining <= 3
}
