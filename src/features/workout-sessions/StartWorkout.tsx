import { Link } from 'react-router'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { listMyPlans } from '../../lib/data'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { exerciseCount } from '../workout-plans/format'
import { useStartWorkout } from './useStartWorkout'
import styles from './workout.module.css'

/** /workout when nothing is in progress: start from a plan or empty. */
export function StartWorkout({ onStarted }: { onStarted: () => void }) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { state, reload } = useAsync(() => listMyPlans(userId), userId)
  const { start, starting, error } = useStartWorkout(onStarted)
  const plans = state.status === 'ready' ? state.data.filter((p) => !p.isArchived) : []

  return (
    <section>
      <div className={styles.header}>
        <h1>Workout</h1>
        <Link to="/workout/history">History</Link>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.section}>
        <h2>Start from a plan</h2>
        {state.status === 'loading' && <p className={styles.muted}>Loading your plans…</p>}
        {state.status === 'error' && (
          <StatusMessage
            tone="error"
            title="Couldn't load your plans"
            action={
              <button type="button" className={controls.button} onClick={reload}>
                Try again
              </button>
            }
          >
            {state.error}
          </StatusMessage>
        )}
        {state.status === 'ready' && plans.length === 0 && (
          <StatusMessage
            title="No plans yet"
            action={
              <span className={styles.actions}>
                <Link to="/plans/new" className={controls.button}>
                  Create a plan
                </Link>
                <Link to="/plans/starters" className={controls.button}>
                  Use a starter plan
                </Link>
              </span>
            }
          >
            A plan fills in your exercises and targets. You can also start an empty workout and add
            exercises as you go.
          </StatusMessage>
        )}
        {plans.length > 0 && (
          <ul className={styles.list}>
            {plans.map((plan) => (
              <li key={plan.id} className={styles.row}>
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{plan.name}</span>
                  <span className={`${styles.muted} ${styles.small}`}>
                    {exerciseCount(plan.exerciseCount)}
                  </span>
                </span>
                <button
                  type="button"
                  className={controls.primary}
                  aria-label={`Start ${plan.name}`}
                  disabled={starting !== null}
                  onClick={() => start(plan)}
                >
                  {starting === plan.id ? 'Starting…' : 'Start'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.section}>
        <h2>Or start empty</h2>
        <p className={styles.muted} style={{ margin: 0 }}>
          Add exercises from the library as you go.
        </p>
        <div>
          <button
            type="button"
            className={controls.button}
            disabled={starting !== null}
            onClick={() => start(null)}
          >
            {starting === 'empty' ? 'Starting…' : 'Start an empty workout'}
          </button>
        </div>
      </div>
    </section>
  )
}
