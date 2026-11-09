import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { StatusMessage } from '../../components/common/StatusMessage'
import { buzz, useCountdown } from '../../hooks/useCountdown'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { returnState } from '../../hooks/useReturnTo'
import { useWakeLock } from '../../hooks/useWakeLock'
import {
  deleteSession,
  finishSession,
  setSessionExerciseSkipped,
  type Exercise,
  type SessionExercise,
  type WorkoutSession,
} from '../../lib/data'
import { distanceUnitFor, round } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import { exerciseKey } from '../workout-plans/planScreen'
import { formatDuration } from '../workout-plans/format'
import { ExerciseLogger } from './ExerciseLogger'
import { formatElapsed, secondsBetween, sessionTotals } from './workoutMath'
import styles from './workout.module.css'

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function status(item: SessionExercise): string {
  if (item.isSkipped) return 'Skipped'
  const target = item.targets.targetSets
  if (target) return `${Math.min(item.sets.length, 99)}/${target} sets`
  return item.sets.length === 1 ? '1 set' : `${item.sets.length} sets`
}

const isDone = (item: SessionExercise) =>
  item.isSkipped ||
  (item.targets.targetSets ? item.sets.length >= item.targets.targetSets : item.sets.length > 0)

/** The workout in progress (/workout). Every completed set is already saved. */
export function ActiveWorkout({
  session,
  library,
  onChange,
  onEnded,
}: {
  session: WorkoutSession
  library: Exercise[] | null
  onChange: (session: WorkoutSession) => void
  onEnded: () => void
}) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { weightUnit, lengthUnit } = useProfile()
  const online = useOnlineStatus()
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const now = useNow(15000)
  const [reviewing, setReviewing] = useState(false)
  const rest = useCountdown(() => buzz([200, 100, 200]))
  useWakeLock(true)

  const byKey = new Map((library ?? []).map((e) => [exerciseKey(e), e]))
  const exercises = session.exercises
  const requested = exercises.findIndex((e) => e.id === params.get('exercise'))
  const firstOpen = exercises.findIndex((e) => !isDone(e))
  const index = requested >= 0 ? requested : Math.max(0, firstOpen)
  const current = exercises[index]
  const doneCount = exercises.filter(isDone).length
  const go = (i: number) => setParams({ exercise: exercises[i].id }, { replace: true })

  const updateItem = (item: SessionExercise) =>
    onChange({ ...session, exercises: exercises.map((e) => (e.id === item.id ? item : e)) })

  if (reviewing) {
    return (
      <FinishReview
        session={session}
        onBack={() => setReviewing(false)}
        onFinished={(id) => navigate(`/workout/history/${id}`, { replace: true })}
        onDiscarded={onEnded}
        userId={userId}
        offline={!online}
      />
    )
  }

  return (
    <section>
      <div className={styles.header}>
        <h1>{session.name}</h1>
        <span className={styles.muted}>
          {formatElapsed(secondsBetween(session.startedAt, new Date(now).toISOString()))} ·{' '}
          {doneCount} of {exercises.length} done
        </span>
      </div>

      {exercises.length > 0 && (
        <ol className={styles.strip} aria-label="Exercises in this workout">
          {exercises.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                className={styles.stripItem}
                aria-current={i === index ? 'step' : undefined}
                onClick={() => go(i)}
              >
                <span className={styles.stripName}>{item.exerciseName}</span>
                <span
                  className={`${styles.stripStatus} ${isDone(item) && !item.isSkipped ? styles.done : ''}`}
                >
                  {isDone(item) && !item.isSkipped ? '✓ ' : ''}
                  {status(item)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {current ? (
        <ExerciseLogger
          key={current.id}
          item={current}
          exercise={byKey.get(exerciseKey(current.exercise))}
          position={index + 1}
          count={exercises.length}
          weightUnit={weightUnit}
          distanceUnit={distanceUnitFor(lengthUnit)}
          offline={!online}
          onChange={updateItem}
          onSkip={async (skipped) => {
            await setSessionExerciseSkipped(userId, current.id, skipped)
            updateItem({ ...current, isSkipped: skipped })
            if (skipped && index < exercises.length - 1) go(index + 1)
          }}
          onPrevious={index > 0 ? () => go(index - 1) : null}
          onNext={index < exercises.length - 1 ? () => go(index + 1) : null}
          onSetSaved={() => {
            // Stay on this exercise (don't jump once its target is met); Next moves on.
            if (!params.get('exercise')) go(index)
            if (current.targets.restSeconds) rest.start(current.targets.restSeconds)
          }}
        />
      ) : (
        <StatusMessage title="No exercises yet">
          Add exercises from the library as you go.
        </StatusMessage>
      )}

      {rest.running && (
        <div className={styles.restBar} role="timer" aria-label="Rest timer">
          <span>
            Rest <span className={styles.restTime}>{formatDuration(rest.remaining)}</span>
          </span>
          <button type="button" className={controls.primary} onClick={rest.stop}>
            Skip rest
          </button>
        </div>
      )}

      <div className={styles.actions} style={{ marginTop: 'var(--space-4)' }}>
        <Link
          to="/workout/add"
          state={returnState(location, 'Workout')}
          className={controls.button}
        >
          Add exercise
        </Link>
        <button type="button" className={controls.primary} onClick={() => setReviewing(true)}>
          Finish workout
        </button>
      </div>
      <p className={`${styles.muted} ${styles.small}`}>
        Each set is saved as soon as you complete it, so you can close the app and pick up where you
        left off.
      </p>
    </section>
  )
}

function FinishReview({
  session,
  userId,
  offline,
  onBack,
  onFinished,
  onDiscarded,
}: {
  session: WorkoutSession
  userId: string
  offline: boolean
  onBack: () => void
  onFinished: (id: string) => void
  onDiscarded: () => void
}) {
  const { weightUnit } = useProfile()
  const totals = sessionTotals(session, weightUnit)
  const [notes, setNotes] = useState(session.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const now = useNow(15000)
  const elapsed = secondsBetween(session.startedAt, new Date(now).toISOString())
  const notLogged = session.exercises.filter((e) => !e.sets.length && !e.isSkipped)

  async function act(action: () => Promise<void>, after: () => void) {
    setBusy(true)
    setError(null)
    try {
      await action()
      after()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <section>
      <div className={styles.header}>
        <h1>Finish {session.name}?</h1>
      </div>
      <dl className={styles.stats}>
        <div>
          <dt>Time</dt>
          <dd>{formatElapsed(elapsed)}</dd>
        </div>
        <div>
          <dt>Sets</dt>
          <dd>{totals.setCount}</dd>
        </div>
        <div>
          <dt>Exercises</dt>
          <dd>
            {totals.exercisesWithSets} of {session.exercises.length}
          </dd>
        </div>
        <div>
          <dt>Volume</dt>
          <dd>
            {round(totals.volume, 0)} {totals.unit}
          </dd>
        </div>
      </dl>
      <p className={`${styles.muted} ${styles.small}`}>
        Volume is reps × weight over every set with both.
      </p>
      {totals.skipped > 0 && <p>Skipped: {totals.skipped}.</p>}
      {notLogged.length > 0 && (
        <p>
          No sets logged for {notLogged.map((e) => e.exerciseName).join(', ')}. They'll show as not
          done.
        </p>
      )}

      <div className={controls.field} style={{ maxWidth: 640, margin: 'var(--space-4) 0' }}>
        <label htmlFor="workout-notes">Notes (optional)</label>
        <textarea
          id="workout-notes"
          className={`${controls.input} ${styles.textarea}`}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {offline && <p className={styles.muted}>You're offline. Reconnect to finish.</p>}

      <div className={styles.actions}>
        <button
          type="button"
          className={controls.primary}
          disabled={busy || offline}
          onClick={() =>
            act(
              () => finishSession(userId, session.id, notes.trim() || null),
              () => onFinished(session.id),
            )
          }
        >
          {busy ? 'Saving…' : 'Finish workout'}
        </button>
        <button type="button" className={controls.button} onClick={onBack} disabled={busy}>
          Keep going
        </button>
        <button
          type="button"
          className={`${controls.button} ${styles.danger}`}
          onClick={() => setConfirmDiscard(true)}
          disabled={busy}
        >
          Discard workout
        </button>
      </div>

      {confirmDiscard && (
        <div
          className={styles.confirm}
          role="group"
          aria-label="Discard this workout?"
          style={{ marginTop: 'var(--space-3)' }}
        >
          <p>Discard this workout and every set in it? This can't be undone.</p>
          <button
            type="button"
            className={`${controls.button} ${styles.danger}`}
            disabled={busy || offline}
            onClick={() => act(() => deleteSession(userId, session.id), onDiscarded)}
          >
            Discard
          </button>
          <button
            type="button"
            className={controls.button}
            onClick={() => setConfirmDiscard(false)}
          >
            Keep it
          </button>
        </div>
      )}
    </section>
  )
}
