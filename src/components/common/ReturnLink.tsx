import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import { useReturnTo } from '../../hooks/useReturnTo'
import styles from './ReturnLink.module.css'

/**
 * A link back to where this screen was opened from. It goes back in history
 * when it can (so filters and scroll come back), and otherwise links to
 * `fallback`. `replace` swaps the current entry for the fallback instead of
 * pushing, for Cancel on forms.
 */
export function ReturnLink({
  fallback,
  replace = false,
  className,
  children,
}: {
  fallback: string
  replace?: boolean
  className?: string
  children: ReactNode
}) {
  const { returnTo, leave } = useReturnTo()
  const onClick = (event: MouseEvent) => {
    if (!returnTo || event.metaKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    leave(fallback)
  }
  return (
    <Link
      to={returnTo?.path ?? fallback}
      replace={!returnTo && replace}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  )
}

/** "← Exercises", or "← <plan name>" when opened from a plan. */
export function BackLink({ fallback, fallbackLabel }: { fallback: string; fallbackLabel: string }) {
  const { returnTo } = useReturnTo()
  return (
    <ReturnLink fallback={fallback} className={styles.back}>
      ← {returnTo?.label ?? fallbackLabel}
    </ReturnLink>
  )
}
