import type { ExerciseRef } from '../../lib/data'

export const exerciseProgressPath = (ref: ExerciseRef) =>
  `/progress/exercises/${ref.source}/${encodeURIComponent(ref.id)}`
