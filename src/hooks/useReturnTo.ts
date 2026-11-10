import { useCallback } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router'

/**
 * Where a screen was opened from. Links that open a screen "on top of"
 * another put this in the router's location state, so the screen can go back
 * in history instead of pushing a new entry. That keeps Back working: no
 * screen is ever left behind a Save or Cancel (issue #53).
 */
export interface ReturnTo {
  /** Path and query of the screen to return to. */
  path: string
  /** What the back link calls it, e.g. "Exercises" or a plan's name. */
  label: string
}

/** Location state for a link opened from the current screen. */
export function returnState(location: Location, label: string): { returnTo: ReturnTo } {
  return { returnTo: { path: location.pathname + location.search, label } }
}

export function readReturnTo(state: unknown): ReturnTo | null {
  const value = (state as { returnTo?: unknown } | null)?.returnTo as Partial<ReturnTo> | undefined
  return typeof value?.path === 'string' && typeof value.label === 'string'
    ? { path: value.path, label: value.label }
    : null
}

/**
 * `leave(fallback)` returns to the screen this one was opened from by going
 * back in history, or, when it was opened directly, replaces it with `fallback`.
 */
export function useReturnTo() {
  const location = useLocation()
  const navigate = useNavigate()
  const returnTo = readReturnTo(location.state)
  const leave = useCallback(
    (fallback: string) => {
      if (returnTo) navigate(-1)
      else navigate(fallback, { replace: true })
    },
    [navigate, returnTo],
  )
  return { returnTo, leave }
}
