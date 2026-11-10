import { Link, useLocation, useParams } from 'react-router'
import { LineChart } from '../../components/charts/LineChart'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { BackLink } from '../../components/common/ReturnLink'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { returnState } from '../../hooks/useReturnTo'
import { getExerciseHistory, listExercisesDone, type ExerciseRef } from '../../lib/data'
import { distanceUnitFor, round } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import { formatDuration } from '../workout-plans/format'
import { formatSet } from '../workout-sessions/workoutMath'
import { longDate, shortDate } from './format'
import { ProgressNav } from './ProgressNav'
import { exerciseProgressPath } from './paths'
import { exerciseRecords, topWeightPerWorkout } from './progressMath'
import styles from './progress.module.css'

/** /progress/exercises: every exercise you've logged, most recent first. */
export function ExercisesProgressPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const location = useLocation()
  const { state, reload } = useAsync(() => listExercisesDone(userId), userId)

  return (
    <section>
      <h1>Progress</h1>
      <ProgressNav />
      {state.status === 'loading' && <LoadingScreen label="Loading your exercises…" />}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load your exercises"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          {state.error}
        </StatusMessage>
      )}
      {state.status === 'ready' && state.data.length === 0 && (
        <StatusMessage
          title="No exercise history yet"
          action={
            <Link to="/workout" className={controls.primary}>
              Start a workout
            </Link>
          }
        >
          After you finish a workout, each exercise gets its history and records here.
        </StatusMessage>
      )}
      {state.status === 'ready' && state.data.length > 0 && (
        <ul className={styles.list}>
          {state.data.map((e) => (
            <li key={`${e.source}:${e.id}`} className={styles.entry}>
              <span className={styles.entryMain}>
                <Link
                  to={exerciseProgressPath(e)}
                  state={returnState(location, 'Exercises')}
                  className={styles.entryValue}
                >
                  {e.name}
                </Link>
                <span className={`${styles.muted} ${styles.small}`}>
                  {e.timesDone === 1 ? 'Once' : `${e.timesDone} times`} · last{' '}
                  {longDate(e.lastDone)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** /progress/exercises/:source/:id: sets across workouts and exact records (step 6.4). */
export function ExerciseProgressPage() {
  const { source = '', id = '' } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { weightUnit, lengthUnit } = useProfile()
  const distanceUnit = distanceUnitFor(lengthUnit)
  const ref: ExerciseRef = { source: source === 'custom' ? 'custom' : 'catalog', id }
  const { state, reload } = useAsync(
    () => getExerciseHistory(userId, ref, 200),
    `${userId}:${source}:${id}`,
  )

  return (
    <section>
      <BackLink fallback="/progress/exercises" fallbackLabel="Exercises" />
      {state.status === 'loading' && <LoadingScreen label="Loading history…" />}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load this history"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          {state.error}
        </StatusMessage>
      )}
      {state.status === 'ready' && state.data.length === 0 && (
        <StatusMessage title="No history for this exercise">
          It shows up after a finished workout with at least one set of it.
        </StatusMessage>
      )}
      {state.status === 'ready' &&
        state.data.length > 0 &&
        (() => {
          const performances = state.data
          const records = exerciseRecords(performances, weightUnit, distanceUnit)
          const top = topWeightPerWorkout(performances, weightUnit)
          return (
            <>
              <h1>{performances[0].exerciseName}</h1>
              <div className={styles.panel}>
                <h2>Records</h2>
                <dl className={styles.records}>
                  {records.heaviest && (
                    <div>
                      <dt>Heaviest</dt>
                      <dd>
                        {round(records.heaviest.weight)} {weightUnit} × {records.heaviest.reps}
                      </dd>
                      <dd className={`${styles.muted} ${styles.small}`}>
                        {longDate(records.heaviest.date)}
                      </dd>
                    </div>
                  )}
                  {records.bestSetVolume && (
                    <div>
                      <dt>Best set (reps × weight)</dt>
                      <dd>
                        {records.bestSetVolume.reps} × {round(records.bestSetVolume.weight)}{' '}
                        {weightUnit}
                      </dd>
                      <dd className={`${styles.muted} ${styles.small}`}>
                        {longDate(records.bestSetVolume.date)}
                      </dd>
                    </div>
                  )}
                  {records.mostReps && (
                    <div>
                      <dt>Most reps in a set</dt>
                      <dd>{records.mostReps.reps}</dd>
                      <dd className={`${styles.muted} ${styles.small}`}>
                        {longDate(records.mostReps.date)}
                      </dd>
                    </div>
                  )}
                  {records.longestHold && (
                    <div>
                      <dt>Longest time</dt>
                      <dd>{formatDuration(records.longestHold.seconds)}</dd>
                      <dd className={`${styles.muted} ${styles.small}`}>
                        {longDate(records.longestHold.date)}
                      </dd>
                    </div>
                  )}
                  {records.longestDistance && (
                    <div>
                      <dt>Longest distance</dt>
                      <dd>
                        {round(records.longestDistance.value, 2)} {distanceUnit}
                      </dd>
                      <dd className={`${styles.muted} ${styles.small}`}>
                        {longDate(records.longestDistance.date)}
                      </dd>
                    </div>
                  )}
                </dl>
                <p className={`${styles.muted} ${styles.small}`} style={{ margin: 0 }}>
                  Records are exactly what you logged. No estimates.
                </p>
              </div>
              {top.length > 1 && (
                <div className={styles.panel}>
                  <h2>Heaviest set per workout</h2>
                  <LineChart
                    label={`Heaviest set per workout in ${weightUnit}`}
                    points={top}
                    formatValue={(v) => `${round(v)} ${weightUnit}`}
                    formatDate={shortDate}
                    height={180}
                  />
                </div>
              )}
              <div className={styles.panel}>
                <h2>Every time</h2>
                <ul className={styles.list}>
                  {performances.map((p) => (
                    <li key={p.sessionId} className={styles.entry}>
                      <span className={styles.entryMain}>
                        <Link to={`/workout/history/${p.sessionId}`} className={styles.entryValue}>
                          {longDate(p.startedAt)} · {p.sessionName}
                        </Link>
                        <span className={styles.small}>{p.sets.map(formatSet).join(', ')}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )
        })()}
    </section>
  )
}
