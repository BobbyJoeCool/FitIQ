import type { PlanTargets } from '../../lib/data'

/** 90 -> "1:30", 45 -> "45 s", 0 -> "none". */
export function formatRest(seconds: number): string {
  if (seconds === 0) return 'none'
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

/** "3 × 8-12 · Rest 1:30", or null when no targets are set. Notes are shown separately. */
export function formatTargets(targets: PlanTargets): string | null {
  const { targetSets: sets, targetReps: reps, restSeconds: rest } = targets
  const parts: string[] = []
  if (sets && reps) parts.push(`${sets} × ${reps}`)
  else if (sets) parts.push(sets === 1 ? '1 set' : `${sets} sets`)
  else if (reps) parts.push(`Reps ${reps}`)
  if (rest !== null) parts.push(`Rest ${formatRest(rest)}`)
  return parts.length ? parts.join(' · ') : null
}

/** "1 exercise", "3 exercises". */
export const exerciseCount = (n: number) => (n === 1 ? '1 exercise' : `${n} exercises`)
