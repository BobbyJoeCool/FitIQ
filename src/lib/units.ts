/**
 * Unit conversion (plan.md sections 8 and 12). Stored values keep their own
 * unit; these convert only for display and totals, so changing a preference
 * never rewrites history.
 */
export type WeightUnit = 'lb' | 'kg'
export type DistanceUnit = 'mi' | 'km' | 'm'
export type LengthUnit = 'in' | 'cm'

const LB_PER_KG = 2.2046226218
const M_PER = { mi: 1609.344, km: 1000, m: 1 } as const
const CM_PER_IN = 2.54

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value
  return from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG
}

export function convertDistance(value: number, from: DistanceUnit, to: DistanceUnit): number {
  if (from === to) return value
  return (value * M_PER[from]) / M_PER[to]
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  if (from === to) return value
  return from === 'in' ? value * CM_PER_IN : value / CM_PER_IN
}

/** Rounds for display: at most `digits` decimals, no trailing zeros ("135", "61.2"). */
export function round(value: number, digits = 1): string {
  const factor = 10 ** digits
  return String(Math.round(value * factor) / factor)
}

/** The distance unit that goes with a length preference: inches → miles, centimetres → km. */
export function distanceUnitFor(length: LengthUnit): 'mi' | 'km' {
  return length === 'in' ? 'mi' : 'km'
}
