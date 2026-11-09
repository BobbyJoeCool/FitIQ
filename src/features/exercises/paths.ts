import type { Exercise } from '../../lib/data'

export function exercisePath(exercise: Pick<Exercise, 'id' | 'source'>): string {
  return exercise.source === 'custom'
    ? `/exercises/custom/${exercise.id}`
    : `/exercises/${encodeURIComponent(exercise.id)}`
}
