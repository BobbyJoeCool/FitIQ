import type { ReactNode } from 'react'

/** Placeholder body for screens that later phases will build. */
export function PagePlaceholder({
  title,
  phase,
  children,
}: {
  title: string
  phase: string
  children?: ReactNode
}) {
  return (
    <section>
      <h1>{title}</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>Coming in {phase}.</p>
      {children}
    </section>
  )
}
