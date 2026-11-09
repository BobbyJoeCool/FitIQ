import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import styles from './OfflineBanner.module.css'

/** Shown on every screen while offline (plan.md section 10). */
export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div className={styles.banner} role="status">
      You're offline. Nothing can be saved until you reconnect; what you've already saved is safe.
    </div>
  )
}
