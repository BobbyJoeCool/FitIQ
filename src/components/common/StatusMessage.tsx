import type { ReactNode } from 'react'
import styles from './StatusMessage.module.css'

/** Error and empty states: a message with an optional action. */
export function StatusMessage({
  tone = 'neutral',
  title,
  children,
  action,
}: {
  tone?: 'neutral' | 'error'
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={styles.box} role={tone === 'error' ? 'alert' : undefined} data-tone={tone}>
      <p className={styles.title}>{title}</p>
      {children && <div className={styles.body}>{children}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
