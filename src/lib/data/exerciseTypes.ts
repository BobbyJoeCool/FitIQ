export type ExerciseSource = 'catalog' | 'custom'

/** One exercise as the app sees it, whether from the catalog or the user's own. */
export interface Exercise {
  /** Catalog: the dataset ID (e.g. "Barbell_Squat"). Custom: the row's UUID. */
  id: string
  source: ExerciseSource
  name: string
  description: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string | null
  difficulty: string | null
  movementType: string | null
  force: string | null
  mechanic: string | null
  instructions: string[]
  /** Absolute image URLs. Empty when the exercise has no images. */
  images: string[]
  videoUrl: string | null
  videoSourceName: string | null
  isArchived: boolean
}
