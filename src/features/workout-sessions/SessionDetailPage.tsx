import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { BackLink } from '../../components/common/ReturnLink'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { returnState } from '../../hooks/useReturnTo'
import { deleteSession, getSession } from '../../lib/data'
import { round } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import { exercisePath } from '../exercises/paths'
import {
  formatDateTime,
  formatElapsed,
  formatSet,
  secondsBetween,
  sessionTotals,
} from './workoutMath'
import styles from './workout.module.css'

/** /workout/history/:id: exactly what was performed (step 5.4). */
export function SessionDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { weightUnit } = useProfile()
  const navigate = useNavigate()
  const location = useLocation()
  const { state, reload } = useAsync(() => getSession(userId, id), `${userId}:${id}`)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await deleteSession(userId, id)
      navigate('/workout/history', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the workout.')
      setBusy(false)
    }
  }

  return (
    <section>
      <BackLink fallback="/workout/history" fallbackLabel="History" />
      {state.status === 'loading' && <LoadingScreen label="Loading workout…" />}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load this workout"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          {state.error}
        </StatusMessage>
      )}
      {state.status === 'ready' && !state.data && (
        <StatusMessage title="Workout not found">
          <Link to="/workout/history">Back to your history</Link>
        </StatusMessage>
      )}
      {state.status === 'ready' &&
        state.data &&
        (() => {
          const session = state.data
          const totals = sessionTotals(session, weightUnit)
          return (
            <>
              <div className={styles.header}>
                <h1>{session.name}</h1>
              </div>
              <p className={styles.muted}>
                {formatDateTime(session.startedAt)}
                {session.completedAt
                  ? ` · ${formatElapsed(secondsBetween(session.startedAt, session.completedAt))}`
                  : ' · in progress'}
              </p>
              <dl className={styles.stats}>
                <div>
                  <dt>Sets</dt>
                  <dd>{totals.setCount}</dd>
                </div>
                <div>
                  <dt>Exercises</dt>
                  <dd>{totals.exercisesWithSets}</dd>
                </div>
                <div>
                  <dt>Skipped</dt>
                  <dd>{totals.skipped}</dd>
                </div>
                <div>
                  <dt>Volume</dt>
                  <dd>
                    {round(totals.volume, 0)} {totals.unit}
                  </dd>
                </div>
              </dl>
              {session.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{session.notes}</p>}

              <ol className={styles.list} style={{ marginTop: 'var(--space-4)' }}>
                {session.exercises.map((item) => (
                  <li key={item.id} className={styles.card}>
                    <h2 style={{ fontSize: 'var(--font-size-lg)' }}>
                      <Link
                        to={exercisePath(item.exercise)}
                        state={returnState(location, session.name)}
                      >
                        {item.exerciseName}
                      </Link>
                    </h2>
                    {item.sets.length > 0 ? (
                      <ol className={styles.sets}>
                        {item.sets.map((set) => (
                          <li key={set.id} className={styles.setRow}>
                            <span className={styles.setNumber}>Set {set.setNumber}</span>
                            <span className={styles.setValue}>{formatSet(set)}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className={styles.muted} style={{ margin: 0 }}>
                        {item.isSkipped ? 'Skipped' : 'Not done'}
                      </p>
                    )}
                  </li>
                ))}
              </ol>

              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <div style={{ marginTop: 'var(--space-5)' }}>
                {confirming ? (
                  <div className={styles.confirm} role="group" aria-label="Delete this workout?">
                    <p>Delete this workout and every set in it? This can't be undone.</p>
                    <button
                      type="button"
                      className={`${controls.button} ${styles.danger}`}
                      disabled={busy}
                      onClick={remove}
                    >
                      {busy ? 'Deleting…' : 'Delete workout'}
                    </button>
                    <button
                      type="button"
                      className={controls.button}
                      onClick={() => setConfirming(false)}
                    >
                      Keep it
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`${controls.button} ${styles.danger}`}
                    onClick={() => setConfirming(true)}
                  >
                    Delete workout
                  </button>
                )}
              </div>
            </>
          )
        })()}
    </section>
  )
}
