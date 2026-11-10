import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { returnState } from '../../hooks/useReturnTo'
import { listSessions, type SessionSummary } from '../../lib/data'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { exerciseCount } from '../workout-plans/format'
import { formatDateTime, formatElapsed, secondsBetween } from './workoutMath'
import styles from './workout.module.css'

/** /workout/history: finished workouts, newest first, 20 at a time (step 5.4). */
export function HistoryPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const location = useLocation()
  const first = useAsync(() => listSessions(userId, 0), userId)
  const [more, setMore] = useState<SessionSummary[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState<boolean | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items = first.state.status === 'ready' ? [...first.state.data.items, ...more] : []
  const canLoadMore = hasMore ?? (first.state.status === 'ready' && first.state.data.hasMore)

  async function loadMore() {
    setLoadingMore(true)
    setError(null)
    try {
      const next = await listSessions(userId, page + 1)
      setMore((current) => [...current, ...next.items])
      setPage(page + 1)
      setHasMore(next.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more workouts.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <section>
      <div className={styles.header}>
        <h1>Workout history</h1>
        <Link to="/workout">Workout</Link>
      </div>
      {first.state.status === 'loading' && <LoadingScreen label="Loading your workouts…" />}
      {first.state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load your workouts"
          action={
            <button type="button" className={controls.button} onClick={first.reload}>
              Try again
            </button>
          }
        >
          {first.state.error}
        </StatusMessage>
      )}
      {first.state.status === 'ready' && items.length === 0 && (
        <StatusMessage
          title="No workouts yet"
          action={
            <Link to="/workout" className={controls.primary}>
              Start a workout
            </Link>
          }
        >
          Finished workouts show up here, with every set you logged.
        </StatusMessage>
      )}
      {items.length > 0 && (
        <ul className={styles.list}>
          {items.map((session) => (
            <li key={session.id}>
              <Link
                to={`/workout/history/${session.id}`}
                state={returnState(location, 'History')}
                className={styles.rowLink}
              >
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{session.name}</span>
                  <span className={`${styles.muted} ${styles.small}`}>
                    {formatDateTime(session.startedAt)}
                    {session.completedAt &&
                      ` · ${formatElapsed(secondsBetween(session.startedAt, session.completedAt))}`}
                    {` · ${exerciseCount(session.exerciseCount)}`}
                  </span>
                </span>
                <span aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {canLoadMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
          <button
            type="button"
            className={controls.button}
            disabled={loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? 'Loading…' : 'Show older workouts'}
          </button>
        </div>
      )}
    </section>
  )
}
