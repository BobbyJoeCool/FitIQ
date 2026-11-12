import type { PlanExerciseTargets, PlanTargets } from '../../lib/data'
import { resolveRest } from '../../lib/rest'

/** A hold or work time: 30 -> "30 s", 90 -> "1:30". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** 90 -> "1:30", 45 -> "45 s", 0 -> "none". */
export function formatRest(seconds: number): string {
  if (seconds === 0) return 'none'
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * "3 × 8-12 · Rest 1:30", "2 × 30 s each side", or null when no targets are set.
 * Notes are shown separately.
 */
export function formatTargets(targets: PlanTargets): string | null {
  const { targetSets: sets, targetReps: reps, restSeconds: rest, targetSeconds: hold } = targets
  const side = targets.perSide ? ' each side' : ''
  const parts: string[] = []
  const release = targets.targetReleaseSeconds
  if (hold && release) {
    // Repeated holds: "3 × 5 × 10 s hold · Release 5 s"
    const count = [sets, reps]
      .filter(Boolean)
      .map((n) => `${n} × `)
      .join('')
    parts.push(`${count}${formatDuration(hold)} hold${side}`)
    parts.push(`Release ${formatDuration(release)}`)
  } else if (hold) {
    const time = `${formatDuration(hold)}${side}`
    parts.push(sets ? `${sets} × ${time}` : `Hold ${time}`)
    if (reps) parts.push(`Reps ${reps}`)
  } else if (sets && reps) parts.push(`${sets} × ${reps}${side}`)
  else if (sets) parts.push(sets === 1 ? '1 set' : `${sets} sets`)
  else if (reps) parts.push(`Reps ${reps}${side}`)
  if (rest !== null) parts.push(`Rest ${formatRest(rest)}`)
  return parts.length ? parts.join(' · ') : null
}

/** "+30 s", "−15 s", "1:30" for offsets of a minute or more. */
export function formatOffset(seconds: number): string {
  const sign = seconds < 0 ? '−' : '+'
  return `${sign}${formatDuration(Math.abs(seconds))}`
}

/**
 * A plan exercise's rest (FV-11): "Rest 2:00 (default + 30 s)", "Rest 1:30
 * (default)", "Rest 45 s". Null when it follows a default that's off.
 */
export function describeRest(
  targets: PlanExerciseTargets,
  defaultRest: number | null,
): string | null {
  const seconds = resolveRest(targets, defaultRest)
  const value = (s: number) => (s === 0 ? 'No rest' : `Rest ${formatRest(s)}`)
  if (targets.restMode === 'fixed') return seconds === null ? null : value(seconds)
  if (targets.restMode === 'offset') {
    const offset = formatOffset(targets.restOffsetSeconds ?? 0).replace(/^([+−])/, '$1 ')
    if (seconds === null) return `Rest: default ${offset} (no default set)`
    return `${value(seconds)} (default ${offset})`
  }
  return seconds === null ? null : `${value(seconds)} (default)`
}

/** formatTargets for a plan exercise, with its rest worked out from the defaults. */
export function formatPlanTargets(
  targets: PlanExerciseTargets,
  defaultRest: number | null,
): string | null {
  const parts = [
    formatTargets({ ...targets, restSeconds: null }),
    describeRest(targets, defaultRest),
  ]
  const text = parts.filter(Boolean).join(' · ')
  return text || null
}

/** "1 exercise", "3 exercises". */
export const exerciseCount = (n: number) => (n === 1 ? '1 exercise' : `${n} exercises`)
