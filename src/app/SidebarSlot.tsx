import { useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { SIDEBAR_QUERY, SidebarSlotContext } from './sidebarSlotContext'

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
