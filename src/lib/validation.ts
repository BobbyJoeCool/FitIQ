import type { CustomExerciseInput } from './data'
import { DIFFICULTIES, EQUIPMENT, MOVEMENT_TYPES, MUSCLES } from './exerciseVocabulary'

/**
 * Client-side validation. Each rule mirrors a CHECK constraint in
 * supabase/migrations so users see the problem before the database rejects it.
 */

export interface CustomExerciseForm {
  name: string
  description: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string
  difficulty: string
  movementType: string
  videoUrl: string
  videoSourceName: string
}

export type CustomExerciseErrors = Partial<Record<keyof CustomExerciseForm, string>>

export const LIMITS = {
  nameMax: 80,
  descriptionMax: 2000,
  videoUrlMax: 500,
  videoSourceNameMax: 80,
} as const

const blankToNull = (value: string) => (value.trim() ? value.trim() : null)
const oneOf = (list: readonly string[], value: string) => list.includes(value)

export function validateCustomExercise(
  form: CustomExerciseForm,
): { ok: true; value: CustomExerciseInput } | { ok: false; errors: CustomExerciseErrors } {
  const errors: CustomExerciseErrors = {}
  const name = form.name.trim()
  const description = blankToNull(form.description)
  const videoUrl = blankToNull(form.videoUrl)
  const videoSourceName = blankToNull(form.videoSourceName)

  if (!name) errors.name = 'Give the exercise a name.'
  else if (name.length > LIMITS.nameMax)
    errors.name = `Keep the name under ${LIMITS.nameMax + 1} characters.`

  if (description && description.length > LIMITS.descriptionMax) {
    errors.description = `Keep the description under ${LIMITS.descriptionMax + 1} characters.`
  }

  if (form.primaryMuscles.length === 0) errors.primaryMuscles = 'Pick at least one primary muscle.'
  else if (!form.primaryMuscles.every((m) => oneOf(MUSCLES, m))) {
    errors.primaryMuscles = 'Pick muscles from the list.'
  }
  if (!form.secondaryMuscles.every((m) => oneOf(MUSCLES, m))) {
    errors.secondaryMuscles = 'Pick muscles from the list.'
  }

  if (form.equipment && !oneOf(EQUIPMENT, form.equipment)) errors.equipment = 'Pick from the list.'
  if (form.difficulty && !oneOf(DIFFICULTIES, form.difficulty)) {
    errors.difficulty = 'Pick from the list.'
  }
  if (form.movementType && !oneOf(MOVEMENT_TYPES, form.movementType)) {
    errors.movementType = 'Pick from the list.'
  }

  if (videoUrl) {
    if (!/^https?:\/\/\S+$/.test(videoUrl)) {
      errors.videoUrl = 'Use a full link starting with https://'
    } else if (videoUrl.length > LIMITS.videoUrlMax) {
      errors.videoUrl = `Keep the link under ${LIMITS.videoUrlMax + 1} characters.`
    }
  }
  if (videoSourceName && videoSourceName.length > LIMITS.videoSourceNameMax) {
    errors.videoSourceName = `Keep this under ${LIMITS.videoSourceNameMax + 1} characters.`
  }

  if (Object.keys(errors).length) return { ok: false, errors }

  // A muscle can't be both primary and secondary.
  const secondaryMuscles = form.secondaryMuscles.filter((m) => !form.primaryMuscles.includes(m))

  return {
    ok: true,
    value: {
      name,
      description,
      primaryMuscles: form.primaryMuscles,
      secondaryMuscles,
      equipment: form.equipment || null,
      difficulty: form.difficulty || null,
      movementType: form.movementType || null,
      videoUrl,
      videoSourceName: videoUrl ? videoSourceName : null,
    },
  }
}
