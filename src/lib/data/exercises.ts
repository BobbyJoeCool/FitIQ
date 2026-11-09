import { loadCatalog } from './catalog'
import { listMyCustomExercises } from './customExercises'
import type { Exercise } from './exerciseTypes'

/**
 * The exercise library: the shared catalog plus the user's own exercises
 * (archived ones included; screens decide whether to show them), sorted by name.
 */
export async function loadExerciseLibrary(userId: string): Promise<Exercise[]> {
  const [catalog, custom] = await Promise.all([loadCatalog(), listMyCustomExercises(userId)])
  return [...catalog, ...custom].sort((a, b) => a.name.localeCompare(b.name))
}

/** One catalog exercise by its dataset ID, or null. */
export async function getCatalogExercise(id: string): Promise<Exercise | null> {
  const catalog = await loadCatalog()
  return catalog.find((exercise) => exercise.id === id) ?? null
}
