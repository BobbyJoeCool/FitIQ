import { describe, expect, it } from 'vitest'
import { toDataError } from './errors'

describe('toDataError', () => {
  it('turns network failures into a plain message', () => {
    const err = toDataError({ message: 'TypeError: Failed to fetch' }, 'fallback')
    expect(err.message).toBe("Can't reach FitIQ's server. Check your connection and try again.")
    expect(err.code).toBe('network')
  })

  it('keeps database messages and codes', () => {
    const err = toDataError({ message: 'duplicate key', code: '23505' }, 'fallback')
    expect(err).toMatchObject({ message: 'duplicate key', code: '23505' })
    expect(toDataError({ message: '' }, 'fallback').message).toBe('fallback')
  })
})
