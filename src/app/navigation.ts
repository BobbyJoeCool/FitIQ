export interface NavItem {
  to: string
  label: string
  /** Shown in the phone bottom bar; the rest live in the phone header. */
  inBottomBar: boolean
}

/** One entry per screen in plan.md section 9. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', inBottomBar: true },
  { to: '/exercises', label: 'Exercises', inBottomBar: true },
  { to: '/plans', label: 'Plans', inBottomBar: true },
  { to: '/workout', label: 'Workout', inBottomBar: true },
  { to: '/progress', label: 'Progress', inBottomBar: true },
  { to: '/cardio', label: 'Cardio', inBottomBar: true },
  { to: '/settings', label: 'Settings', inBottomBar: false },
]
