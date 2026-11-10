import { createContext } from 'react'

/** The element under the side navigation where a page can put its main action. */
export const SidebarSlotContext = createContext<HTMLElement | null>(null)

/** Matches the AppShell breakpoint where the side navigation replaces the bottom bar. */
export const SIDEBAR_QUERY = '(min-width: 640px)'
