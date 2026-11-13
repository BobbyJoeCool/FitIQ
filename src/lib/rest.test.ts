import { describe, expect, it } from 'vitest'
import { effectiveDefaultRest, resolveRest } from './rest'

const t = (
  restMode: 'default' | 'offset' | 'fixed',
  restSeconds: number | null,
  restOffsetSeconds: number | null,
) => ({
  restMode,
  restSeconds,
  restOffsetSeconds,
})

describe('resolveRest (FV-11)', () => {
  it('follows, adjusts, or replaces the default, like start_workout', () => {
    expect(resolveRest(t('default', null, null), 90)).toBe(90)
    expect(resolveRest(t('offset', null, 30), 90)).toBe(120)
    expect(resolveRest(t('offset', null, -120), 90)).toBe(0)
    expect(resolveRest(t('offset', null, 3600), 90)).toBe(3600)
    expect(resolveRest(t('fixed', 45, null), 90)).toBe(45)
  })

  it('has no rest when it follows a default that is off', () => {
    expect(resolveRest(t('default', null, null), null)).toBeNull()
    expect(resolveRest(t('offset', null, 30), null)).toBeNull()
    expect(resolveRest(t('fixed', 0, null), null)).toBe(0)
  })

  it("uses the plan's default before Settings", () => {
    expect(effectiveDefaultRest(60, 90)).toBe(60)
    expect(effectiveDefaultRest(null, 90)).toBe(90)
    expect(effectiveDefaultRest(null, undefined)).toBeNull()
    expect(effectiveDefaultRest(0, 90)).toBe(0)
  })
})
