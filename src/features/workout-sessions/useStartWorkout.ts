import { useState } from 'react'
import { getMyPlan, loadCatalog, startWorkout } from '../../lib/data'
import { useAuth } from '../auth/AuthContext'

/**
 * Starts a workout from a plan (copying its exercises and targets) or empty.
 * Catalog names are looked up here, because the catalog isn't in the database.
 */
export function useStartWorkout(onStarted: (sessionId: string) => void) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [starting, setStarting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function start(plan: { id: string; name: string } | null) {
    setStarting(plan?.id ?? 'empty')
    setError(null)
    try {
      const catalogNames: Record<string, string> = {}
      if (plan) {
        const [full, catalog] = await Promise.all([
          getMyPlan(userId, plan.id),
          // Without the catalog the database falls back to readable IDs.
          loadCatalog().catch(() => []),
        ])
        const names = new Map(catalog.map((e) => [e.id, e.name]))
        for (const item of full?.exercises ?? []) {
          const name = item.exercise.source === 'catalog' && names.get(item.exercise.id)
          if (name) catalogNames[item.exercise.id] = name
        }
      }
      const id = await startWorkout({
        name: plan?.name ?? 'Workout',
        planId: plan?.id ?? null,
        catalogNames,
      })
      onStarted(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the workout.')
      setStarting(null)
    }
  }

  return { start, starting, error }
}
