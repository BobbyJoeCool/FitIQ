import type { CustomExerciseInput, PlanInput, PlanTargets } from './data'
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
  planNameMax: 80,
  planDescriptionMax: 1000,
  targetSetsMax: 20,
  targetRepsMax: 20,
  restSecondsMax: 3600,
  targetSecondsMax: 600,
  planNotesMax: 500,
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

export interface PlanForm {
  name: string
  description: string
}

export type PlanErrors = Partial<Record<keyof PlanForm, string>>

export function validatePlan(
  form: PlanForm,
): { ok: true; value: PlanInput } | { ok: false; errors: PlanErrors } {
  const errors: PlanErrors = {}
  const name = form.name.trim()
  const description = blankToNull(form.description)
  if (!name) errors.name = 'Give the plan a name.'
  else if (name.length > LIMITS.planNameMax)
    errors.name = `Keep the name under ${LIMITS.planNameMax + 1} characters.`
  if (description && description.length > LIMITS.planDescriptionMax) {
    errors.description = `Keep the description under ${LIMITS.planDescriptionMax + 1} characters.`
  }
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, value: { name, description } }
}

/** The targets form holds text, as typed, so half-typed numbers can be reported. */
export interface TargetsForm {
  targetSets: string
  targetReps: string
  restSeconds: string
  targetSeconds: string
  releaseSeconds: string
  perSide: boolean
  notes: string
}

export type TargetsErrors = Partial<Record<Exclude<keyof TargetsForm, 'perSide'>, string>>

const wholeNumber = (value: string) => (/^\d+$/.test(value) ? Number(value) : NaN)

export function validateTargets(
  form: TargetsForm,
): { ok: true; value: PlanTargets } | { ok: false; errors: TargetsErrors } {
  const errors: TargetsErrors = {}
  const setsText = form.targetSets.trim()
  const restText = form.restSeconds.trim()
  const holdText = form.targetSeconds.trim()
  const releaseText = form.releaseSeconds.trim()
  const targetReps = blankToNull(form.targetReps)
  const notes = blankToNull(form.notes)

  const targetSets = setsText ? wholeNumber(setsText) : null
  if (targetSets !== null && !(targetSets >= 1 && targetSets <= LIMITS.targetSetsMax)) {
    errors.targetSets = `Use a whole number from 1 to ${LIMITS.targetSetsMax}.`
  }
  if (targetReps && targetReps.length > LIMITS.targetRepsMax) {
    errors.targetReps = `Keep this under ${LIMITS.targetRepsMax + 1} characters, e.g. 8-12.`
  }
  const restSeconds = restText ? wholeNumber(restText) : null
  if (restSeconds !== null && !(restSeconds >= 0 && restSeconds <= LIMITS.restSecondsMax)) {
    errors.restSeconds = `Use whole seconds from 0 to ${LIMITS.restSecondsMax}.`
  }
  const targetSeconds = holdText ? wholeNumber(holdText) : null
  if (targetSeconds !== null && !(targetSeconds >= 1 && targetSeconds <= LIMITS.targetSecondsMax)) {
    errors.targetSeconds = `Use whole seconds from 1 to ${LIMITS.targetSecondsMax}.`
  }
  const targetReleaseSeconds = releaseText ? wholeNumber(releaseText) : null
  if (
    targetReleaseSeconds !== null &&
    !(targetReleaseSeconds >= 1 && targetReleaseSeconds <= LIMITS.targetSecondsMax)
  ) {
    errors.releaseSeconds = `Use whole seconds from 1 to ${LIMITS.targetSecondsMax}.`
  } else if (targetReleaseSeconds !== null && targetSeconds === null && !errors.targetSeconds) {
    errors.releaseSeconds = 'Set a hold time too: release is the break between holds.'
  }
  if (notes && notes.length > LIMITS.planNotesMax) {
    errors.notes = `Keep notes under ${LIMITS.planNotesMax + 1} characters.`
  }
  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    value: {
      targetSets,
      targetReps,
      restSeconds,
      targetSeconds,
      targetReleaseSeconds,
      perSide: form.perSide,
      notes,
    },
  }
}

export function targetsToForm(targets: PlanTargets): TargetsForm {
  return {
    targetSets: targets.targetSets?.toString() ?? '',
    targetReps: targets.targetReps ?? '',
    restSeconds: targets.restSeconds?.toString() ?? '',
    targetSeconds: targets.targetSeconds?.toString() ?? '',
    releaseSeconds: targets.targetReleaseSeconds?.toString() ?? '',
    perSide: targets.perSide,
    notes: targets.notes ?? '',
  }
}
