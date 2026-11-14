import type { NavIconName } from './NavIcon'

export interface NavItem {
  to: string
  label: string
  icon: NavIconName
  /** Shown in the phone bottom bar; the rest live in the phone header. */
  inBottomBar: boolean
}

/** One entry per screen in plan.md section 9. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home', inBottomBar: true },
  { to: '/exercises', label: 'Exercises', icon: 'exercises', inBottomBar: true },
  { to: '/plans', label: 'Plans', icon: 'plans', inBottomBar: true },
  { to: '/workout', label: 'Workout', icon: 'workout', inBottomBar: true },
  { to: '/progress', label: 'Progress', icon: 'progress', inBottomBar: true },
  { to: '/cardio', label: 'Cardio', icon: 'cardio', inBottomBar: true },
  { to: '/settings', label: 'Settings', icon: 'settings', inBottomBar: false },
]
