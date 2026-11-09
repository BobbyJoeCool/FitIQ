import type { Exercise } from '../../lib/data'

export interface ExerciseFilters {
  query: string
  muscle: string
  equipment: string
  movementType: string
  difficulty: string
  /** Include the user's archived custom exercises. */
  showArchived: boolean
}

export const EMPTY_FILTERS: ExerciseFilters = {
  query: '',
  muscle: '',
  equipment: '',
  movementType: '',
  difficulty: '',
  showArchived: false,
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Every filter applies together. The query matches names word by word, in any order. */
export function filterExercises(exercises: Exercise[], filters: ExerciseFilters): Exercise[] {
  const words = normalize(filters.query).split(' ').filter(Boolean)
  return exercises.filter((exercise) => {
    if (exercise.isArchived && !filters.showArchived) return false
    if (filters.muscle) {
      const muscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles]
      if (!muscles.includes(filters.muscle)) return false
    }
    if (filters.equipment && exercise.equipment !== filters.equipment) return false
    if (filters.movementType && exercise.movementType !== filters.movementType) return false
    if (filters.difficulty && exercise.difficulty !== filters.difficulty) return false
    if (words.length) {
      const name = normalize(exercise.name)
      if (!words.every((word) => name.includes(word))) return false
    }
    return true
  })
}

export function hasActiveFilters(filters: ExerciseFilters): boolean {
  return Boolean(
    filters.query.trim() ||
    filters.muscle ||
    filters.equipment ||
    filters.movementType ||
    filters.difficulty ||
    filters.showArchived,
  )
}
