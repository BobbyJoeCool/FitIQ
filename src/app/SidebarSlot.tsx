import { createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../hooks/useMediaQuery'

/** The element under the side navigation where a page can put its main action. */
export const SidebarSlotContext = createContext<HTMLElement | null>(null)

/** Matches the AppShell breakpoint where the side navigation replaces the bottom bar. */
export const SIDEBAR_QUERY = '(min-width: 640px)'

/**
 * A page action that sits in the side navigation when it's showing (tablet and
 * desktop), and in the page itself on phones, wrapped in `inlineClassName`.
 */
export function SidebarAction({
  children,
  inlineClassName,
}: {
  children: ReactNode
  inlineClassName?: string
}) {
  const slot = useContext(SidebarSlotContext)
  const wide = useMediaQuery(SIDEBAR_QUERY)
  if (slot && wide) return createPortal(children, slot)
  return <div className={inlineClassName}>{children}</div>
}
