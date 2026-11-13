import {
  getMyPlan,
  isPlanUsed,
  loadExerciseLibrary,
  type Exercise,
  type ExerciseRef,
  type PlanWithExercises,
} from '../../lib/data'

export const exerciseKey = (ref: ExerciseRef) => `${ref.source}:${ref.id}`

export interface PlanScreenData {
  plan: PlanWithExercises | null
  /** The exercise library, or null if it couldn't load (the plan still shows). */
  library: Exercise[] | null
  /** Whether a workout used the plan, so it can't be deleted (FV-6); null if unknown. */
  used: boolean | null
}

/** A plan plus the library, to show exercise names and details. */
export async function loadPlanScreen(userId: string, planId: string): Promise<PlanScreenData> {
  const [plan, library, used] = await Promise.all([
    getMyPlan(userId, planId),
    loadExerciseLibrary(userId).catch(() => null),
    isPlanUsed(userId, planId).catch(() => null),
  ])
  return { plan, library, used }
}

export function indexLibrary(library: Exercise[] | null): Map<string, Exercise> {
  return new Map((library ?? []).map((exercise) => [exerciseKey(exercise), exercise]))
}

/** A readable name when the exercise isn't in the library (catalog didn't load, or the ID changed). */
export function fallbackName(ref: ExerciseRef): string {
  return ref.source === 'catalog' ? ref.id.replace(/_/g, ' ') : 'Custom exercise'
}
