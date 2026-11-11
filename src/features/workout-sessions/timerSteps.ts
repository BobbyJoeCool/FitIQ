/** One stretch of the hold timer: a hold, a release between holds, or a pause to switch sides. */
export interface TimerStep {
  kind: 'hold' | 'release' | 'switch'
  seconds: number
  label: string
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
  const steps: TimerStep[] = []
  sides.forEach((side, s) => {
    for (let h = 1; h <= count; h += 1) {
      steps.push({ kind: 'hold', seconds, label: count > 1 ? `${side} · ${h} of ${count}` : side })
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
