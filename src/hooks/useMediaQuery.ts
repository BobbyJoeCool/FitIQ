import { useEffect, useState } from 'react'

/** Whether a CSS media query matches, kept up to date. False where matchMedia is missing. */
export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && (window.matchMedia?.(query).matches ?? false)
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    const list = window.matchMedia?.(query)
    if (!list) return
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}
