import { describe, expect, it } from 'vitest'
import {
  toLocalInput,
  unitForType,
  validateCardio,
  validateMeasurement,
  validateWeighIn,
} from './entryValidation'

const NOW = new Date(2026, 10, 9, 8, 30)

describe('validateWeighIn', () => {
  it('accepts a plausible weigh-in in either unit', () => {
    const result = validateWeighIn(
      { value: '182.4', unit: 'lb', when: '2026-11-09T07:15', notes: ' ' },
      NOW,
    )
    expect(result).toEqual({
      ok: true,
      value: {
        value: 182.4,
        unit: 'lb',
        recordedAt: new Date(2026, 10, 9, 7, 15).toISOString(),
        notes: null,
      },
    })
    expect(
      validateWeighIn({ value: '82.7', unit: 'kg', when: toLocalInput(NOW), notes: '' }, NOW).ok,
    ).toBe(true)
  })

  it('rejects impossible values, bad numbers, and future times', () => {
    const errors = (value: string, unit: 'lb' | 'kg', when = '2026-11-09T07:00') => {
      const r = validateWeighIn({ value, unit, when, notes: '' }, NOW)
      return r.ok ? {} : r.errors
    }
    expect(errors('', 'lb').value).toBe('Enter your weight.')
    expect(errors('5', 'lb').value).toBe('Use a weight between 20 and 1000 lb.')
    expect(errors('500', 'kg').value).toBe('Use a weight between 9 and 455 kg.')
    expect(errors('180.123', 'lb').value).toBeDefined()
    expect(errors('180', 'lb', '2026-11-10T07:00').when).toBe("That's in the future.")
    expect(errors('180', 'lb', '').when).toBe('Pick a date and time.')
  })
})

describe('validateMeasurement', () => {
  it('uses % for body fat and the length unit otherwise', () => {
    expect(unitForType('body_fat', 'in')).toBe('%')
    expect(unitForType('waist', 'cm')).toBe('cm')
    const r = validateMeasurement(
      { type: 'waist', value: '34.5', lengthUnit: 'in', when: '2026-11-09T07:00', notes: '' },
      NOW,
    )
    expect(r).toMatchObject({ ok: true, value: { type: 'waist', value: 34.5, unit: 'in' } })
  })

  it('rejects values outside the range for the unit', () => {
    const bad = (type: 'waist' | 'body_fat', value: string, lengthUnit: 'in' | 'cm' = 'in') =>
      validateMeasurement({ type, value, lengthUnit, when: '2026-11-09T07:00', notes: '' }, NOW).ok
    expect(bad('waist', '0.5')).toBe(false)
    expect(bad('waist', '121')).toBe(false)
    expect(bad('waist', '121', 'cm')).toBe(true)
    expect(bad('body_fat', '80')).toBe(false)
    expect(bad('body_fat', '22.5')).toBe(true)
  })

  it('formats local datetime-input values', () => {
    expect(toLocalInput(new Date(2026, 0, 5, 7, 3))).toBe('2026-01-05T07:03')
  })
})

describe('validateCardio', () => {
  const base = {
    activity: 'walking_pad' as const,
    when: '2026-11-09T07:00',
    minutes: '30',
    distance: '1.5',
    distanceUnit: 'mi' as const,
    incline: '2.5',
    notes: '',
  }

  it('turns the form into a session, with optional fields as null', () => {
    expect(validateCardio(base, NOW)).toEqual({
      ok: true,
      value: {
        activity: 'walking_pad',
        startedAt: new Date(2026, 10, 9, 7, 0).toISOString(),
        durationSeconds: 1800,
        distanceValue: 1.5,
        distanceUnit: 'mi',
        incline: 2.5,
        notes: null,
      },
    })
    expect(validateCardio({ ...base, distance: '', incline: '' }, NOW)).toMatchObject({
      ok: true,
      value: { distanceValue: null, distanceUnit: null, incline: null },
    })
    expect(validateCardio({ ...base, minutes: '12.5' }, NOW)).toMatchObject({
      value: { durationSeconds: 750 },
    })
  })

  it('rejects what the database would', () => {
    const errs = (patch: Partial<typeof base>) => {
      const r = validateCardio({ ...base, ...patch }, NOW)
      return r.ok ? {} : r.errors
    }
    expect(errs({ minutes: '' }).minutes).toBeDefined()
    expect(errs({ minutes: '0' }).minutes).toBeDefined()
    expect(errs({ minutes: '1441' }).minutes).toBeDefined()
    expect(errs({ distance: '1001' }).distance).toBeDefined()
    expect(errs({ incline: '41' }).incline).toBeDefined()
    expect(errs({ incline: '2.25' }).incline).toBeDefined()
  })
})
