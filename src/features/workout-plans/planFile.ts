import type {
  CustomExerciseInput,
  Exercise,
  ExerciseRef,
  PlanExerciseTargets,
  PlanInput,
  PlanWithExercises,
} from '../../lib/data'
import { validateCustomExercise, validatePlan, validateTargets } from '../../lib/validation'

/**
 * Plan files (FV-15): a plan as JSON, so it can be shared or written outside
 * the app and imported. The format is documented in docs/plan-format.md and
 * public/plan.schema.json. A file is untrusted input: everything is checked
 * with the plan builder's own validation before anything is saved, and IDs
 * in the file are never used except as catalog exercise IDs.
 */

export const PLAN_FILE_FORMAT = 'fitiq-plan'
/**
 * 2 (1.5.0) adds the default rest: `defaultRestSeconds` on the plan and
 * `restOffsetSeconds` on exercises. Version 1 files still import.
 */
export const PLAN_FILE_VERSION = 2
export const PLAN_FILE_MAX_BYTES = 200_000
export const PLAN_FILE_MAX_EXERCISES = 100

/** A copied custom exercise: enough to recreate it in another account. */
export interface PlanFileCustomExercise {
  name: string
  description?: string | null
  primaryMuscles: string[]
  secondaryMuscles?: string[]
  equipment?: string | null
  difficulty?: string | null
  movementType?: string | null
  videoUrl?: string | null
  videoSourceName?: string | null
}

export interface PlanFileExercise {
  /** Free Exercise DB ID, e.g. "Barbell_Squat". Either this or `custom`. */
  catalogId?: string
  /** The exercise's name, for people reading the file. Ignored for catalog exercises on import. */
  name?: string
  custom?: PlanFileCustomExercise
  sets?: number | null
  reps?: string | null
  seconds?: number | null
  releaseSeconds?: number | null
  perSide?: boolean
  /** A set rest time. Without this or restOffsetSeconds, the exercise follows the default rest. */
  restSeconds?: number | null
  /** Seconds added to the default rest (negative to take away). Version 2. */
  restOffsetSeconds?: number | null
  notes?: string | null
}

export interface PlanFile {
  format: typeof PLAN_FILE_FORMAT
  version: number
  name: string
  description?: string | null
  /** This plan's default rest, in seconds. Version 2. */
  defaultRestSeconds?: number | null
  exercises: PlanFileExercise[]
}

const exerciseKey = (ref: ExerciseRef) => `${ref.source}:${ref.id}`

/** The file for a plan. Only the routine: no IDs, dates, or workout history. */
export function buildPlanFile(plan: PlanWithExercises, library: Exercise[] | null): PlanFile {
  const byKey = new Map((library ?? []).map((e) => [exerciseKey(e), e]))
  return {
    format: PLAN_FILE_FORMAT,
    version: PLAN_FILE_VERSION,
    name: plan.name,
    description: plan.description,
    defaultRestSeconds: plan.defaultRestSeconds,
    exercises: plan.exercises.map((item) => {
      const exercise = byKey.get(exerciseKey(item.exercise))
      const targets = {
        sets: item.targetSets,
        reps: item.targetReps,
        seconds: item.targetSeconds,
        releaseSeconds: item.targetReleaseSeconds,
        perSide: item.perSide,
        restSeconds: item.restMode === 'fixed' ? item.restSeconds : null,
        restOffsetSeconds: item.restMode === 'offset' ? item.restOffsetSeconds : null,
        notes: item.notes,
      }
      if (item.exercise.source === 'catalog') {
        return { catalogId: item.exercise.id, name: exercise?.name ?? item.exercise.id, ...targets }
      }
      return {
        custom: exercise
          ? {
              name: exercise.name,
              description: exercise.description,
              primaryMuscles: exercise.primaryMuscles,
              secondaryMuscles: exercise.secondaryMuscles,
              equipment: exercise.equipment,
              difficulty: exercise.difficulty,
              movementType: exercise.movementType,
              videoUrl: exercise.videoUrl,
              videoSourceName: exercise.videoSourceName,
            }
          : { name: 'Custom exercise', primaryMuscles: [] },
        ...targets,
      }
    }),
  }
}

export function planFileText(plan: PlanWithExercises, library: Exercise[] | null): string {
  return `${JSON.stringify(buildPlanFile(plan, library), null, 2)}\n`
}

/** "Push Day!" → "push-day.fitiq-plan.json". */
export function planFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${slug || 'plan'}.fitiq-plan.json`
}

/** One exercise as it will be imported. */
export type ImportItem =
  | { kind: 'catalog'; name: string; ref: ExerciseRef; targets: PlanExerciseTargets }
  | { kind: 'custom-existing'; name: string; ref: ExerciseRef; targets: PlanExerciseTargets }
  /** `customKey` groups repeats of the same new exercise, so it's created once. */
  | {
      kind: 'custom-new'
      name: string
      custom: CustomExerciseInput
      customKey: string
      targets: PlanExerciseTargets
    }
  /** A catalog ID the library doesn't have: skipped. */
  | { kind: 'unknown'; name: string; catalogId: string }

export interface ImportPreview {
  plan: PlanInput
  items: ImportItem[]
}

export type ParseResult = { ok: true; preview: ImportPreview } | { ok: false; error: string }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** A number or text from the file, as the form would hold it; null when absent. */
function asText(value: unknown, field: string): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') return value
  throw new Error(`${field} should be a number or text.`)
}

function optionalString(value: unknown, field: string): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw new Error(`${field} should be text.`)
  return value
}

function stringList(value: unknown, field: string): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new Error(`${field} should be a list of text.`)
  }
  return value
}

function firstError(errors: Record<string, string | undefined>): string {
  return Object.values(errors).find(Boolean) ?? 'Something in it is not valid.'
}

const normalName = (name: string) => name.trim().toLowerCase()

/**
 * Reads a plan file into a preview. `library` is the catalog plus the user's
 * own custom exercises (`loadExerciseLibrary`); custom exercises in the file
 * match one of yours by name, or are marked to be created.
 */
export function parsePlanFile(text: string, library: Exercise[]): ParseResult {
  if (new Blob([text]).size > PLAN_FILE_MAX_BYTES) {
    return { ok: false, error: 'That file is too big for a plan (over 200 KB).' }
  }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: "That file isn't valid JSON, so it can't be a FitIQ plan." }
  }
  if (!isObject(data) || data.format !== PLAN_FILE_FORMAT) {
    return { ok: false, error: 'That file isn\'t a FitIQ plan (it needs "format": "fitiq-plan").' }
  }
  if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1) {
    return { ok: false, error: 'The plan file has no valid "version".' }
  }
  if (data.version > PLAN_FILE_VERSION) {
    return {
      ok: false,
      error: `This plan was made by a newer version of FitIQ (file version ${data.version}). Refresh the app and try again.`,
    }
  }

  try {
    const plan = validatePlan({
      name: optionalString(data.name, 'The plan name'),
      description: optionalString(data.description, 'The plan description'),
      defaultRest: asText(data.defaultRestSeconds, 'The plan default rest'),
    })
    if (!plan.ok) return { ok: false, error: firstError(plan.errors) }

    if (!Array.isArray(data.exercises) || data.exercises.length === 0) {
      return { ok: false, error: 'The plan has no exercises.' }
    }
    if (data.exercises.length > PLAN_FILE_MAX_EXERCISES) {
      return { ok: false, error: `A plan can have up to ${PLAN_FILE_MAX_EXERCISES} exercises.` }
    }

    const catalog = new Map(library.filter((e) => e.source === 'catalog').map((e) => [e.id, e]))
    const mine = new Map<string, Exercise>()
    for (const e of library) {
      if (e.source === 'custom' && !e.isArchived && !mine.has(normalName(e.name))) {
        mine.set(normalName(e.name), e)
      }
    }

    const items = data.exercises.map((raw, i): ImportItem => {
      const where = `Exercise ${i + 1}`
      if (!isObject(raw)) throw new Error(`${where} isn't an object.`)
      const restSeconds = asText(raw.restSeconds, `${where}: restSeconds`)
      const restOffset = asText(raw.restOffsetSeconds, `${where}: restOffsetSeconds`)
      if (restSeconds && restOffset) {
        throw new Error(`${where} has both "restSeconds" and "restOffsetSeconds": use one.`)
      }
      const targets = validateTargets({
        targetSets: asText(raw.sets, `${where}: sets`),
        targetReps: asText(raw.reps, `${where}: reps`),
        restMode: restSeconds ? 'fixed' : restOffset ? 'offset' : 'default',
        restSeconds,
        restOffset,
        targetSeconds: asText(raw.seconds, `${where}: seconds`),
        releaseSeconds: asText(raw.releaseSeconds, `${where}: releaseSeconds`),
        perSide: raw.perSide === true,
        notes: optionalString(raw.notes, `${where}: notes`),
      })
      if (!targets.ok) throw new Error(`${where}: ${firstError(targets.errors)}`)

      const hasCatalog = raw.catalogId !== undefined && raw.catalogId !== null
      const hasCustom = raw.custom !== undefined && raw.custom !== null
      if (hasCatalog === hasCustom) {
        throw new Error(`${where} needs either "catalogId" or "custom", not both.`)
      }
      if (hasCatalog) {
        if (typeof raw.catalogId !== 'string' || !raw.catalogId.trim()) {
          throw new Error(`${where}: "catalogId" should be text.`)
        }
        const id = raw.catalogId.trim()
        const found = catalog.get(id)
        if (!found) {
          const label = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : id
          return { kind: 'unknown', name: label.slice(0, 80), catalogId: id.slice(0, 200) }
        }
        return {
          kind: 'catalog',
          name: found.name,
          ref: { source: 'catalog', id },
          targets: targets.value,
        }
      }

      if (!isObject(raw.custom)) throw new Error(`${where}: "custom" should be an object.`)
      const c = raw.custom
      const custom = validateCustomExercise({
        name: optionalString(c.name, `${where}: custom name`),
        description: optionalString(c.description, `${where}: custom description`),
        primaryMuscles: stringList(c.primaryMuscles, `${where}: primaryMuscles`),
        secondaryMuscles: stringList(c.secondaryMuscles, `${where}: secondaryMuscles`),
        equipment: optionalString(c.equipment, `${where}: equipment`),
        difficulty: optionalString(c.difficulty, `${where}: difficulty`),
        movementType: optionalString(c.movementType, `${where}: movementType`),
        videoUrl: optionalString(c.videoUrl, `${where}: videoUrl`),
        videoSourceName: optionalString(c.videoSourceName, `${where}: videoSourceName`),
      })
      if (!custom.ok) throw new Error(`${where} (custom): ${firstError(custom.errors)}`)
      const existing = mine.get(normalName(custom.value.name))
      if (existing) {
        return {
          kind: 'custom-existing',
          name: existing.name,
          ref: { source: 'custom', id: existing.id },
          targets: targets.value,
        }
      }
      return {
        kind: 'custom-new',
        name: custom.value.name,
        custom: custom.value,
        customKey: normalName(custom.value.name),
        targets: targets.value,
      }
    })

    if (items.every((item) => item.kind === 'unknown')) {
      return { ok: false, error: "None of the plan's exercises are in the exercise library." }
    }
    return { ok: true, preview: { plan: plan.value, items } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'The plan file is not valid.' }
  }
}
