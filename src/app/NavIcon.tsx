import { useId } from 'react'

export type NavIconName =
  'home' | 'exercises' | 'plans' | 'workout' | 'progress' | 'cardio' | 'settings'

const PATHS: Record<NavIconName, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  exercises: <path d="M6.5 6v12M17.5 6v12M3 9v6M21 9v6M6.5 12h11" />,
  plans: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2.5h6V4M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  workout: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.5 2.5M9.5 2.5h5M12 2.5V6M18.5 6.5l1.5-1.5" />
    </>
  ),
  progress: <path d="M3 17.5 9 11.5l4 4 8-8M15 7.5h6v6" />,
  cardio: (
    <>
      <path d="M12 20.5s-8-5-9.2-10A5 5 0 0 1 12 6.6a5 5 0 0 1 9.2 3.9C20 15.5 12 20.5 12 20.5z" />
      <path d="M6.5 12.5h3l1.5-2.5 2 4 1.5-1.5h3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
}

/** A decorative line icon for a navigation entry; the link's text names it. */
export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}

/** The FitIQ mark: a dumbbell on the energy gradient. Decorative. */
export function BrandMark({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      width="30"
      height="30"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7a18" />
          <stop offset="1" stopColor="#ff3d6e" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <g fill="#ffffff">
        <rect x="6" y="12.25" width="2.25" height="7.5" rx="0.75" />
        <rect x="8.75" y="10.4" width="2.75" height="11.2" rx="0.9" />
        <rect x="11.5" y="14.75" width="9" height="2.5" rx="0.75" />
        <rect x="20.5" y="10.4" width="2.75" height="11.2" rx="0.9" />
        <rect x="23.75" y="12.25" width="2.25" height="7.5" rx="0.75" />
      </g>
    </svg>
  )
}
