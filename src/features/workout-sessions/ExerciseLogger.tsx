import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAsync } from '../../hooks/useAsync'
import { returnState } from '../../hooks/useReturnTo'
import {
  deleteSet,
  getExerciseHistory,
  saveSet,
  updateSet,
  type Exercise,
  type SessionExercise,
  type SessionSet,
  type SetInput,
} from '../../lib/data'
import type { DistanceUnit, WeightUnit } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { exercisePath } from '../exercises/paths'
import { formatTargets } from '../workout-plans/format'
import { SetForm } from './SetForm'
import { formatDateTime, formatSet, nextSetDefaults, setModeFor } from './workoutMath'
import styles from './workout.module.css'

/** The current exercise in a workout: last time, sets done, and the next set. */
export function ExerciseLogger({
  item,
  exercise,
  position,
  count,
  weightUnit,
  distanceUnit,
  offline,
  onChange,
  onSkip,
  onPrevious,
  onNext,
  onSetSaved,
}: {
  item: SessionExercise
  exercise: Exercise | undefined
  position: number
  count: number
  weightUnit: WeightUnit
  distanceUnit: DistanceUnit
  offline: boolean
  onChange: (item: SessionExercise) => void
  onSkip: (skipped: boolean) => Promise<void>
  onPrevious: (() => void) | null
  onNext: (() => void) | null
  onSetSaved: () => void
}) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const location = useLocation()
  const mode = setModeFor(exercise, item.targets)
  const history = useAsync(
    () => getExerciseHistory(userId, item.exercise, 1),
    `${userId}:${item.exercise.source}:${item.exercise.id}`,
  )
  const lastTime = history.state.status === 'ready' ? history.state.data[0] : undefined
  const [editing, setEditing] = useState<string | null>(null)
  const [skipError, setSkipError] = useState<string | null>(null)
  const sets = item.sets
  const nextNumber = (sets.at(-1)?.setNumber ?? 0) + 1
  const target = item.targets.targetSets
  const summary = formatTargets(item.targets)
  const targetMet = target !== null && sets.length >= target
  const offlineReason = offline ? "You're offline. Reconnect to save this set." : undefined

  async function addSet(input: SetInput) {
    const saved = await saveSet(item.id, nextNumber, input)
    onChange({ ...item, sets: [...sets, saved] })
    onSetSaved()
  }

  async function editSet(set: SessionSet, input: SetInput) {
    const saved = await updateSet(userId, set.id, input)
    onChange({ ...item, sets: sets.map((s) => (s.id === saved.id ? saved : s)) })
    setEditing(null)
  }

  async function removeSet(set: SessionSet) {
    await deleteSet(userId, set.id)
    onChange({ ...item, sets: sets.filter((s) => s.id !== set.id) })
  }

  async function toggleSkip() {
    setSkipError(null)
    try {
      await onSkip(!item.isSkipped)
    } catch (err) {
      setSkipError(err instanceof Error ? err.message : 'Could not update the exercise.')
    }
  }

  const title = target
    ? nextNumber <= target
      ? `Set ${nextNumber} of ${target}`
      : `Extra set (${nextNumber})`
    : `Set ${nextNumber}`

  return (
    <article className={styles.card} aria-labelledby="current-exercise">
      <div className={styles.cardTop}>
        <span className={`${styles.muted} ${styles.small}`}>
          Exercise {position} of {count}
        </span>
        <h2 id="current-exercise">
          {exercise ? (
            <Link to={exercisePath(item.exercise)} state={returnState(location, 'Workout')}>
              {item.exerciseName}
            </Link>
          ) : (
            item.exerciseName
          )}
        </h2>
        {summary && <span>Target: {summary}</span>}
        {item.targets.notes && <span className={styles.muted}>{item.targets.notes}</span>}
        {lastTime && (
          <span className={`${styles.muted} ${styles.small}`}>
            Last time ({formatDateTime(lastTime.startedAt).split(' · ')[0]}):{' '}
            {lastTime.sets.map(formatSet).join(', ')}
          </span>
        )}
      </div>

      {item.isSkipped && (
        <p className={styles.skipped}>Skipped. Unskip it to log sets, or move on.</p>
      )}

      {sets.length > 0 && (
        <ol className={styles.sets} aria-label="Sets done">
          {sets.map((set) =>
            editing === set.id ? (
              <li key={set.id}>
                <SetForm
                  mode={mode}
                  title={`Edit set ${set.setNumber}`}
                  initial={set}
                  weightUnit={set.weightUnit ?? weightUnit}
                  distanceUnit={set.distanceUnit ?? distanceUnit}
                  holdSeconds={null}
                  perSide={item.targets.perSide}
                  submitLabel="Save set"
                  disabledReason={offlineReason}
                  onSubmit={(input) => editSet(set, input)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <SetRow
                key={set.id}
                set={set}
                onEdit={() => setEditing(set.id)}
                onDelete={() => removeSet(set)}
                offline={offline}
              />
            ),
          )}
        </ol>
      )}

      {!item.isSkipped && editing === null && history.state.status === 'loading' && (
        // Wait for last time's numbers (one quick query) so they can prefill the entry.
        <p className={`${styles.entry} ${styles.muted}`}>Loading last time…</p>
      )}
      {!item.isSkipped && editing === null && history.state.status !== 'loading' && (
        <SetForm
          key={`${item.id}:${nextNumber}`}
          mode={mode}
          title={title}
          initial={nextSetDefaults(sets.at(-1), lastTime?.sets, item.targets, weightUnit)}
          weightUnit={weightUnit}
          distanceUnit={distanceUnit}
          holdSeconds={item.targets.targetSeconds}
          perSide={item.targets.perSide}
          submitLabel="Complete set"
          disabledReason={offlineReason}
          onSubmit={addSet}
        />
      )}
      {targetMet && !item.isSkipped && (
        <p className={styles.done} style={{ margin: 0 }}>
          All {target} target sets done.
        </p>
      )}
      {skipError && (
        <p className={styles.error} role="alert">
          {skipError}
        </p>
      )}

      <div className={styles.navRow}>
        <button
          type="button"
          className={`${controls.button} ${styles.compact}`}
          disabled={!onPrevious}
          onClick={onPrevious ?? undefined}
        >
          ← Previous
        </button>
        <button
          type="button"
          className={`${controls.button} ${styles.compact}`}
          onClick={toggleSkip}
          disabled={offline}
        >
          {item.isSkipped ? 'Unskip' : 'Skip'}
        </button>
        <button
          type="button"
          className={`${targetMet || item.isSkipped ? controls.primary : controls.button} ${styles.compact}`}
          disabled={!onNext}
          onClick={onNext ?? undefined}
        >
          Next →
        </button>
      </div>
    </article>
  )
}

function SetRow({
  set,
  onEdit,
  onDelete,
  offline,
}: {
  set: SessionSet
  onEdit: () => void
  onDelete: () => Promise<void>
  offline: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <li className={styles.setRow}>
      <span className={styles.setNumber}>Set {set.setNumber}</span>
      <span className={styles.setValue}>{formatSet(set)}</span>
      {confirming ? (
        <span className={styles.setActions}>
          <button
            type="button"
            className={`${controls.button} ${styles.danger} ${styles.compact}`}
            disabled={offline}
            onClick={() =>
              onDelete().catch((err: unknown) =>
                setError(err instanceof Error ? err.message : 'Could not delete the set.'),
              )
            }
          >
            Delete
          </button>
          <button
            type="button"
            className={`${controls.button} ${styles.compact}`}
            onClick={() => setConfirming(false)}
          >
            Keep
          </button>
        </span>
      ) : (
        <span className={styles.setActions}>
          <button
            type="button"
            className={`${controls.button} ${styles.compact}`}
            aria-label={`Edit set ${set.setNumber}`}
            onClick={onEdit}
          >
            Edit
          </button>
          <button
            type="button"
            className={`${controls.button} ${styles.compact}`}
            aria-label={`Delete set ${set.setNumber}`}
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        </span>
      )}
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </li>
  )
}
