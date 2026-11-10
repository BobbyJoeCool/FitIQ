import { Link, useNavigate } from 'react-router'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import {
  getInProgressSession,
  getLatestWeighIn,
  listFinishedWorkoutDates,
  listMyPlans,
  listSessions,
} from '../../lib/data'
import { convertWeight, round } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import { longDate } from '../progress/format'
import { workoutTotals } from '../progress/progressMath'
import { exerciseCount } from '../workout-plans/format'
import { useStartWorkout } from '../workout-sessions/useStartWorkout'
import { formatDateTime, formatElapsed, secondsBetween } from '../workout-sessions/workoutMath'
import styles from './dashboard.module.css'

async function loadDashboard(userId: string) {
  const [inProgress, recent, finished, plans, latestWeight] = await Promise.all([
    getInProgressSession(userId),
    listSessions(userId, 0, 3),
    listFinishedWorkoutDates(userId),
    listMyPlans(userId),
    getLatestWeighIn(userId),
  ])
  const active = plans.filter((p) => !p.isArchived && p.exerciseCount > 0)
  // "Up next" is the plan you used most recently (docs/future-versions.md FV-7
  // fallback, until programs exist), else your first plan.
  const lastPlanId = finished.find((w) => w.planId && active.some((p) => p.id === w.planId))?.planId
  const upNext = active.find((p) => p.id === lastPlanId) ?? active[0] ?? null
  return { inProgress, recent: recent.items, finished, upNext, latestWeight, now: new Date() }
}

/** The dashboard (step 6.5): today's workout, recent activity, latest weight, quick links. */
export function DashboardPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { profile, weightUnit } = useProfile()
  const navigate = useNavigate()
  const { state, reload } = useAsync(() => loadDashboard(userId), userId)
  const starter = useStartWorkout(() => navigate('/workout'))
  const name = profile?.displayName || user?.email

  return (
    <section>
      <h1>Hi{name ? `, ${name}` : ''}</h1>
      {state.status === 'loading' && <LoadingScreen label="Loading your dashboard…" />}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load your dashboard"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          {state.error}
        </StatusMessage>
      )}
      {state.status === 'ready' &&
        (() => {
          const { inProgress, recent, finished, upNext, latestWeight, now } = state.data
          const totals = workoutTotals(finished, now)
          const setsSoFar = inProgress?.exercises.reduce((n, e) => n + e.sets.length, 0) ?? 0
          return (
            <div className={styles.grid}>
              {inProgress ? (
                <div className={styles.hero}>
                  <h2>Workout in progress</h2>
                  <p className={styles.big}>{inProgress.name}</p>
                  <p className={styles.muted} style={{ margin: 0 }}>
                    Started {formatDateTime(inProgress.startedAt)} ·{' '}
                    {setsSoFar === 1 ? '1 set' : `${setsSoFar} sets`} so far
                  </p>
                  <div>
                    <Link to="/workout" className={controls.primary}>
                      Resume workout
                    </Link>
                  </div>
                </div>
              ) : (
                <div className={styles.hero}>
                  <h2>{upNext ? 'Up next' : 'Start a workout'}</h2>
                  {upNext ? (
                    <>
                      <p className={styles.big}>{upNext.name}</p>
                      <p className={styles.muted} style={{ margin: 0 }}>
                        {exerciseCount(upNext.exerciseCount)}
                      </p>
                    </>
                  ) : (
                    <p className={styles.muted} style={{ margin: 0 }}>
                      Make a plan to have your next workout ready here, or start an empty one.
                    </p>
                  )}
                  <div className={styles.actions}>
                    {upNext && (
                      <button
                        type="button"
                        className={controls.primary}
                        disabled={starter.starting !== null}
                        onClick={() => starter.start(upNext)}
                      >
                        {starter.starting ? 'Starting…' : `Start ${upNext.name}`}
                      </button>
                    )}
                    <Link to="/workout" className={controls.button}>
                      {upNext ? 'Choose another' : 'Start a workout'}
                    </Link>
                    {!upNext && (
                      <Link to="/plans/starters" className={controls.button}>
                        Try a starter plan
                      </Link>
                    )}
                  </div>
                  {starter.error && (
                    <p className={styles.error} role="alert">
                      {starter.error}
                    </p>
                  )}
                </div>
              )}

              <div className={styles.card}>
                <h2>This week</h2>
                <p className={styles.big}>
                  {totals.thisWeek === 1 ? '1 workout' : `${totals.thisWeek} workouts`}
                </p>
                <p className={`${styles.muted} ${styles.small}`} style={{ margin: 0 }}>
                  {totals.last30Days} in the last 30 days · {totals.total} all time
                </p>
                <Link to="/progress">See progress</Link>
              </div>

              <div className={styles.card}>
                <h2>Weight</h2>
                {latestWeight ? (
                  <>
                    <p className={styles.big}>
                      {round(convertWeight(latestWeight.value, latestWeight.unit, weightUnit))}{' '}
                      {weightUnit}
                    </p>
                    <p className={`${styles.muted} ${styles.small}`} style={{ margin: 0 }}>
                      {longDate(latestWeight.recordedAt)}
                    </p>
                  </>
                ) : (
                  <p className={styles.muted} style={{ margin: 0 }}>
                    No weigh-ins yet.
                  </p>
                )}
                <Link to="/progress/weight">Log a weigh-in</Link>
              </div>

              <div className={styles.card}>
                <h2>Recent workouts</h2>
                {recent.length === 0 ? (
                  <p className={styles.muted} style={{ margin: 0 }}>
                    Your finished workouts will show here.
                  </p>
                ) : (
                  <ul className={styles.list}>
                    {recent.map((s) => (
                      <li key={s.id}>
                        <Link to={`/workout/history/${s.id}`}>{s.name}</Link>
                        <span className={`${styles.muted} ${styles.small}`}>
                          {formatDateTime(s.startedAt).split(' · ')[0]}
                          {s.completedAt &&
                            ` · ${formatElapsed(secondsBetween(s.startedAt, s.completedAt))}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/workout/history">All workouts</Link>
              </div>

              <div className={styles.card}>
                <h2>Quick links</h2>
                <div className={styles.links}>
                  <Link to="/exercises" className={controls.button}>
                    Exercises
                  </Link>
                  <Link to="/plans" className={controls.button}>
                    Plans
                  </Link>
                  <Link to="/progress/measurements" className={controls.button}>
                    Measurements
                  </Link>
                  <Link to="/cardio" className={controls.button}>
                    Cardio
                  </Link>
                </div>
              </div>
            </div>
          )
        })()}
    </section>
  )
}
