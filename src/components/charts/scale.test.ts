import { describe, expect, it } from 'vitest'
import { linear, niceTicks, tickLabel } from './scale'

describe('chart scales', () => {
  it('makes round ticks that cover the data', () => {
    expect(niceTicks(176.4, 183.2)).toEqual([176, 178, 180, 182, 184])
    expect(niceTicks(0, 5)).toEqual([0, 2, 4, 6])
    expect(niceTicks(0, 1, 4)).toEqual([0, 0.25, 0.5, 0.75, 1])
    const flat = niceTicks(180, 180)
    expect(flat[0]).toBeLessThanOrEqual(180)
    expect(flat.at(-1)).toBeGreaterThanOrEqual(180)
  })

  it('maps linearly and handles a flat domain', () => {
    expect(linear(0, 10, 0, 100)(2.5)).toBe(25)
    expect(linear(5, 5, 0, 100)(5)).toBe(50)
  })

  it('labels ticks compactly above 10,000', () => {
    expect(tickLabel(1250)).toBe('1,250')
    expect(tickLabel(12000)).toBe('12K')
    expect(tickLabel(2.5)).toBe('2.5')
  })
})
