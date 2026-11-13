import type { PlanExerciseTargets } from './data'

/**
 * The rest a plan exercise gets, in seconds (FV-11), or null for no rest
 * timer. Mirrors start_workout in supabase/migrations/20261112000100_default_rest.sql,
 * which does the same when a workout starts.
 *
 * `defaultRest` is the plan's default, else the Settings default, else null.
 */
export function resolveRest(
  targets: Pick<PlanExerciseTargets, 'restMode' | 'restSeconds' | 'restOffsetSeconds'>,
  defaultRest: number | null,
): number | null {
  if (targets.restMode === 'fixed') return targets.restSeconds
  if (defaultRest === null) return null
  if (targets.restMode === 'offset') {
    return Math.max(0, Math.min(3600, defaultRest + (targets.restOffsetSeconds ?? 0)))
  }
  return defaultRest
}

/** The plan's default, falling back to Settings. */
export const effectiveDefaultRest = (
  planDefault: number | null | undefined,
  profileDefault: number | null | undefined,
): number | null => planDefault ?? profileDefault ?? null
