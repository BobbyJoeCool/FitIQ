import { Link } from 'react-router'
import { ColumnChart } from '../../components/charts/ColumnChart'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { getLatestWeighIn, listFinishedWorkoutDates } from '../../lib/data'
import { convertWeight, round } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import { longDate, shortDate } from './format'
import { ProgressNav } from './ProgressNav'
import { weeklyCounts, workoutTotals } from './progressMath'
import styles from './progress.module.css'

/** /progress: workout frequency and totals (step 6.4), plus the latest weigh-in. */
export function ProgressPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { weightUnit } = useProfile()
  const { state, reload } = useAsync(async () => {
    const [workouts, latest] = await Promise.all([
      listFinishedWorkoutDates(userId),
      getLatestWeighIn(userId),
    ])
    // "Now" is fixed when the data loads, so weeks don't shift between renders.
    return { workouts, latest, now: new Date() }
  }, userId)

  return (
    <section>
      <h1>Progress</h1>
      <ProgressNav />
      {state.status === 'loading' && <LoadingScreen label="Loading your progress…" />}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load your progress"
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
          const { workouts, latest, now } = state.data
          const totals = workoutTotals(workouts, now)
          const weeks = weeklyCounts(workouts, 12, now)
          return (
            <>
              <dl className={styles.tiles}>
                <div className={styles.tile}>
                  <dt>Workouts</dt>
                  <dd>{totals.total}</dd>
                  <small>all time</small>
                </div>
                <div className={styles.tile}>
                  <dt>Last 30 days</dt>
                  <dd>{totals.last30Days}</dd>
                </div>
                <div className={styles.tile}>
                  <dt>This week</dt>
                  <dd>{totals.thisWeek}</dd>
                  <small>since Monday</small>
                </div>
                <div className={styles.tile}>
                  <dt>Per week</dt>
                  <dd>{totals.perWeek}</dd>
                  <small>average, last 12 weeks</small>
                </div>
              </dl>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2>Workouts per week</h2>
                  <span className={`${styles.muted} ${styles.small}`}>Last 12 weeks</span>
                </div>
                {totals.total === 0 ? (
                  <StatusMessage
                    title="No finished workouts yet"
                    action={
                      <Link to="/workout" className={controls.primary}>
                        Start a workout
                      </Link>
                    }
                  >
                    Your weekly count shows up here after your first workout.
                  </StatusMessage>
                ) : (
                  <ColumnChart
                    label="Workouts per week, last 12 weeks"
                    columns={weeks.map((w) => ({
                      label: shortDate(w.weekStart.toISOString()),
                      fullLabel: `Week of ${longDate(w.weekStart.toISOString())}`,
                      value: w.count,
                    }))}
                    formatValue={(v) => (v === 1 ? '1 workout' : `${v} workouts`)}
                  />
                )}
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2>Weight</h2>
                  <Link to="/progress/weight">Weight details</Link>
                </div>
                {latest ? (
                  <p style={{ margin: 0 }}>
                    Latest:{' '}
                    <strong>
                      {round(convertWeight(latest.value, latest.unit, weightUnit))} {weightUnit}
                    </strong>{' '}
                    <span className={styles.muted}>on {longDate(latest.recordedAt)}</span>
                  </p>
                ) : (
                  <p className={styles.muted} style={{ margin: 0 }}>
                    No weigh-ins yet. <Link to="/progress/weight">Log your first</Link>.
                  </p>
                )}
              </div>
            </>
          )
        })()}
    </section>
  )
}
