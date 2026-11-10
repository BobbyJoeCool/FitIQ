import { describe, expect, it } from 'vitest'
import { CATALOG_URL, parseCatalog } from '../../lib/data/catalog'
import { STARTER_PLANS } from './starterPlans'

/**
 * Checks the starter plans against the real pinned catalog, so bumping
 * CATALOG_COMMIT can't silently break them. Needs network access (CI has it);
 * the pinned file is immutable on jsDelivr.
 */
describe('starter plans', () => {
  it('only use exercise IDs from the pinned catalog', { timeout: 30_000 }, async () => {
    const response = await fetch(CATALOG_URL)
    expect(response.ok).toBe(true)
    const ids = new Set(parseCatalog(await response.json()).map((e) => e.id))
    for (const plan of STARTER_PLANS) {
      const missing = plan.exercises.map((e) => e.id).filter((id) => !ids.has(id))
      expect(missing, plan.name).toEqual([])
    }
  })

  it('have unique slugs and valid targets', () => {
    expect(new Set(STARTER_PLANS.map((p) => p.slug)).size).toBe(STARTER_PLANS.length)
    for (const plan of STARTER_PLANS) {
      expect(plan.exercises.length).toBeGreaterThan(0)
      for (const { targets } of plan.exercises) {
        expect(targets.targetSeconds ?? 1).toBeGreaterThanOrEqual(1)
        expect(targets.targetSeconds ?? 1).toBeLessThanOrEqual(600)
      }
    }
  })
})
