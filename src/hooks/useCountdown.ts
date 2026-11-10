import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A countdown that stays accurate when the tab is in the background: it
 * measures against an end time rather than counting ticks.
 */
export function useCountdown(onDone?: () => void) {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    if (endsAt === null) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= endsAt) {
        setEndsAt(null)
        doneRef.current?.()
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [endsAt])

  const start = useCallback((seconds: number) => {
    const t = Date.now()
    setNow(t)
    setEndsAt(t + seconds * 1000)
  }, [])
  const stop = useCallback(() => setEndsAt(null), [])
  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000))
  return { running: endsAt !== null, remaining, start, stop }
}

/** A short buzz where supported (Android); iOS ignores it. */
export function buzz(pattern: number | number[] = 200) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Not supported.
  }
}
