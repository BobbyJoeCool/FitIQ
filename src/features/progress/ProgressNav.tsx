import { NavLink } from 'react-router'
import styles from './progress.module.css'

const LINKS = [
  { to: '/progress', label: 'Overview', end: true },
  { to: '/progress/weight', label: 'Weight', end: false },
  { to: '/progress/measurements', label: 'Measurements', end: false },
  { to: '/progress/exercises', label: 'Exercises', end: false },
]

export function ProgressNav() {
  return (
    <nav aria-label="Progress">
      <ul className={styles.nav}>
        {LINKS.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} end={link.end} className={styles.navLink}>
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
