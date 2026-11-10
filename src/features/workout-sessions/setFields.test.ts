import { describe, expect, it } from 'vitest'
import { parseSet, toFields } from './setFields'

const blank = { reps: '', weight: '', seconds: '', minutes: '', distance: '', bodyweight: false }

describe('parseSet', () => {
  it('reads strength sets, with weight optional', () => {
    expect(parseSet('strength', { ...blank, reps: '8', weight: '135' }, 'lb', 'mi')).toEqual({
      ok: true,
      value: {
        reps: 8,
        weightValue: 135,
        weightUnit: 'lb',
        isBodyweight: false,
        durationSeconds: null,
        distanceValue: null,
        distanceUnit: 'mi',
        notes: null,
      },
    })
    expect(parseSet('strength', { ...blank, reps: '12' }, 'kg', 'km')).toMatchObject({
      ok: true,
      value: { reps: 12, weightValue: null },
    })
  })

  it('reads timed and cardio sets', () => {
    expect(parseSet('timed', { ...blank, seconds: '30' }, 'lb', 'mi')).toMatchObject({
      ok: true,
      value: { durationSeconds: 30, reps: null },
    })
    expect(
      parseSet('cardio', { ...blank, minutes: '12.5', distance: '1.25' }, 'lb', 'mi'),
    ).toMatchObject({
      ok: true,
      value: { durationSeconds: 750, distanceValue: 1.25, distanceUnit: 'mi' },
    })
  })

  it('rejects what the database would', () => {
    const bad = (mode: 'strength' | 'timed' | 'cardio', f: Partial<typeof blank>) =>
      parseSet(mode, { ...blank, ...f }, 'lb', 'mi').ok
    expect(bad('strength', {})).toBe(false)
    expect(bad('strength', { reps: '8.5' })).toBe(false)
    expect(bad('strength', { reps: '1001' })).toBe(false)
    expect(bad('strength', { reps: '8', weight: '2001' })).toBe(false)
    expect(bad('strength', { reps: '8', weight: '1.234' })).toBe(false)
    expect(bad('timed', { seconds: 'abc' })).toBe(false)
    expect(bad('cardio', { distance: '-1' })).toBe(false)
  })

  it('round-trips existing values into fields', () => {
    expect(
      toFields({
        reps: 8,
        weightValue: 61.25,
        weightUnit: 'kg',
        isBodyweight: true,
        durationSeconds: 90,
        distanceValue: null,
        distanceUnit: null,
        notes: null,
      }),
    ).toEqual({
      reps: '8',
      weight: '61.25',
      seconds: '90',
      minutes: '1.5',
      distance: '',
      bodyweight: true,
    })
  })

  it('reads bodyweight sets, with added weight optional', () => {
    expect(
      parseSet('strength', { ...blank, reps: '10', bodyweight: true }, 'lb', 'mi'),
    ).toMatchObject({ ok: true, value: { reps: 10, isBodyweight: true, weightValue: null } })
    expect(
      parseSet('strength', { ...blank, reps: '8', weight: '25', bodyweight: true }, 'lb', 'mi'),
    ).toMatchObject({ ok: true, value: { reps: 8, isBodyweight: true, weightValue: 25 } })
    // Only strength sets can be bodyweight.
    expect(
      parseSet('timed', { ...blank, seconds: '30', bodyweight: true }, 'lb', 'mi'),
    ).toMatchObject({
      ok: true,
      value: { isBodyweight: false },
    })
  })
})
