import { useCallback, useEffect, useRef, useState } from 'react'

export type AsyncState<T> =
  { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; data: T }

const LOADING = { status: 'loading' } as const

/**
 * Runs `load` on mount and whenever `key` changes, with loading and error
 * states and a `reload` for retry buttons. `key` must change whenever the
 * inputs `load` depends on change. Results from stale runs are ignored.
 */
export function useAsync<T>(load: () => Promise<T>, key: string) {
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  const [attempt, setAttempt] = useState(0)
  const token = `${key}#${attempt}`
  const [result, setResult] = useState<{ token: string; state: AsyncState<T> } | null>(null)

  useEffect(() => {
    let active = true
    loadRef
      .current()
      .then((data) => {
        if (active) setResult({ token, state: { status: 'ready', data } })
      })
      .catch((err: unknown) => {
        if (active) {
          const error = err instanceof Error ? err.message : 'Something went wrong.'
          setResult({ token, state: { status: 'error', error } })
        }
      })
    return () => {
      active = false
    }
  }, [token])

  // A result for an older key or attempt means the current one is still loading.
  const state: AsyncState<T> = result?.token === token ? result.state : LOADING
  const setState = useCallback((next: AsyncState<T>) => setResult({ token, state: next }), [token])
  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { state, setState, reload }
}
