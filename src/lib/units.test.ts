import { describe, expect, it } from 'vitest'
import { convertDistance, convertLength, convertWeight, distanceUnitFor, round } from './units'

describe('units', () => {
  it('converts weight both ways and leaves same-unit values alone', () => {
    expect(convertWeight(100, 'kg', 'lb')).toBeCloseTo(220.462, 3)
    expect(convertWeight(220.462, 'lb', 'kg')).toBeCloseTo(100, 3)
    expect(convertWeight(135, 'lb', 'lb')).toBe(135)
  })

  it('converts distance and length', () => {
    expect(convertDistance(1, 'mi', 'km')).toBeCloseTo(1.609, 3)
    expect(convertDistance(5, 'km', 'mi')).toBeCloseTo(3.107, 3)
    expect(convertDistance(400, 'm', 'mi')).toBeCloseTo(0.2485, 4)
    expect(convertLength(10, 'in', 'cm')).toBeCloseTo(25.4, 5)
    expect(convertLength(100, 'cm', 'in')).toBeCloseTo(39.37, 2)
  })

  it('rounds for display without trailing zeros', () => {
    expect(round(135)).toBe('135')
    expect(round(61.234)).toBe('61.2')
    expect(round(2.005, 2)).toBe('2.01')
    expect(round(-0.04)).toBe('0')
  })

  it('pairs distance units with length preferences', () => {
    expect(distanceUnitFor('in')).toBe('mi')
    expect(distanceUnitFor('cm')).toBe('km')
  })
})
