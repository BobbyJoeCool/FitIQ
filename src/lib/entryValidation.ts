import type { CardioActivity } from './cardioActivities'
import type {
  CardioInput,
  MeasurementInput,
  MeasurementType,
  MeasurementUnit,
  WeighInInput,
} from './data'
import type { WeightUnit } from './units'

/**
 * Validation for weigh-ins and measurements (steps 6.1 and 6.3). Ranges match
 * the CHECK constraints in supabase/migrations/20261110000000_sessions_and_tracking.sql.
 */

export const WEIGHT_RANGE: Record<WeightUnit, [number, number]> = { lb: [20, 1000], kg: [9, 455] }
export const MEASUREMENT_RANGE: Record<MeasurementUnit, [number, number]> = {
  in: [1, 120],
  cm: [2.5, 305],
  '%': [1, 75],
}

/** "YYYY-MM-DDTHH:mm" in local time, for a datetime-local input. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseWhen(text: string, now: Date): string | { error: string } {
  const date = new Date(text)
  if (!text || Number.isNaN(date.getTime())) return { error: 'Pick a date and time.' }
  if (date.getTime() > now.getTime() + 5 * 60_000) return { error: "That's in the future." }
  return date.toISOString()
}

const NUMBER = /^\d+(\.\d{1,2})?$/

export interface WeighInForm {
  value: string
  unit: WeightUnit
  when: string
  notes: string
}

export function validateWeighIn(
  form: WeighInForm,
  now = new Date(),
):
  | { ok: true; value: WeighInInput }
  | { ok: false; errors: Partial<Record<keyof WeighInForm, string>> } {
  const errors: Partial<Record<keyof WeighInForm, string>> = {}
  const [min, max] = WEIGHT_RANGE[form.unit]
  const text = form.value.trim()
  const value = Number(text)
  if (!text) errors.value = 'Enter your weight.'
  else if (!NUMBER.test(text) || value < min || value > max) {
    errors.value = `Use a weight between ${min} and ${max} ${form.unit}.`
  }
  const when = parseWhen(form.when, now)
  if (typeof when !== 'string') errors.when = when.error
  const notes = form.notes.trim()
  if (notes.length > 500) errors.notes = 'Keep notes under 501 characters.'
  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    value: { value, unit: form.unit, recordedAt: when as string, notes: notes || null },
  }
}

export interface MeasurementForm {
  type: MeasurementType
  value: string
  /** The length unit; body fat always uses %. */
  lengthUnit: 'in' | 'cm'
  when: string
  notes: string
}

export const unitForType = (type: MeasurementType, lengthUnit: 'in' | 'cm'): MeasurementUnit =>
  type === 'body_fat' ? '%' : lengthUnit

export function validateMeasurement(
  form: MeasurementForm,
  now = new Date(),
):
  | { ok: true; value: MeasurementInput }
  | { ok: false; errors: Partial<Record<keyof MeasurementForm, string>> } {
  const errors: Partial<Record<keyof MeasurementForm, string>> = {}
  const unit = unitForType(form.type, form.lengthUnit)
  const [min, max] = MEASUREMENT_RANGE[unit]
  const text = form.value.trim()
  const value = Number(text)
  if (!text) errors.value = 'Enter the measurement.'
  else if (!NUMBER.test(text) || value < min || value > max) {
    errors.value = `Use a value between ${min} and ${max} ${unit}.`
  }
  const when = parseWhen(form.when, now)
  if (typeof when !== 'string') errors.when = when.error
  const notes = form.notes.trim()
  if (notes.length > 500) errors.notes = 'Keep notes under 501 characters.'
  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    value: { type: form.type, value, unit, recordedAt: when as string, notes: notes || null },
  }
}

export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  waist: 'Waist',
  hips: 'Hips',
  chest: 'Chest',
  neck: 'Neck',
  shoulders: 'Shoulders',
  left_arm: 'Left arm',
  right_arm: 'Right arm',
  left_thigh: 'Left thigh',
  right_thigh: 'Right thigh',
  left_calf: 'Left calf',
  right_calf: 'Right calf',
  body_fat: 'Body fat',
}

// ---------------------------------------------------------------------------
// Cardio (step 7.1)
// ---------------------------------------------------------------------------

export interface CardioForm {
  activity: CardioActivity
  when: string
  minutes: string
  distance: string
  distanceUnit: 'mi' | 'km'
  incline: string
  notes: string
}

export function validateCardio(
  form: CardioForm,
  now = new Date(),
):
  | { ok: true; value: CardioInput }
  | { ok: false; errors: Partial<Record<keyof CardioForm, string>> } {
  const errors: Partial<Record<keyof CardioForm, string>> = {}
  const minutesText = form.minutes.trim()
  const minutes = Number(minutesText)
  if (!minutesText) errors.minutes = 'Enter how long, in minutes.'
  else if (!NUMBER.test(minutesText) || minutes <= 0 || minutes > 1440) {
    errors.minutes = 'Use minutes between 1 second and 24 hours, like 30 or 12.5.'
  }
  const distanceText = form.distance.trim()
  const distance = Number(distanceText)
  if (distanceText && (!NUMBER.test(distanceText) || distance > 1000)) {
    errors.distance = 'Use a distance up to 1000, with at most 2 decimals.'
  }
  const inclineText = form.incline.trim()
  const incline = Number(inclineText)
  if (inclineText && (!/^\d+(\.\d)?$/.test(inclineText) || incline > 40)) {
    errors.incline = 'Use an incline from 0 to 40 %, with at most 1 decimal.'
  }
  const when = parseWhen(form.when, now)
  if (typeof when !== 'string') errors.when = when.error
  const notes = form.notes.trim()
  if (notes.length > 500) errors.notes = 'Keep notes under 501 characters.'
  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    value: {
      activity: form.activity,
      startedAt: when as string,
      durationSeconds: Math.max(1, Math.round(minutes * 60)),
      distanceValue: distanceText ? distance : null,
      distanceUnit: distanceText ? form.distanceUnit : null,
      incline: inclineText ? incline : null,
      notes: notes || null,
    },
  }
}
