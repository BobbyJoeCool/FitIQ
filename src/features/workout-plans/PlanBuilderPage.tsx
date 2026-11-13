import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { BackLink } from '../../components/common/ReturnLink'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { returnState } from '../../hooks/useReturnTo'
import {
  deletePlan,
  removePlanExercise,
  reorderPlanExercises,
  setPlanArchived,
  updatePlanExercise,
  type PlanWithExercises,
} from '../../lib/data'
import { downloadFile } from '../../lib/download'
import controls from '../../styles/controls.module.css'
import { effectiveDefaultRest } from '../../lib/rest'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import { useStartWorkout } from '../workout-sessions/useStartWorkout'
import { exerciseCount, formatRest } from './format'
import { PlanExerciseItem } from './PlanExerciseItem'
import { planFileName, planFileText } from './planFile'
import { exerciseKey, fallbackName, indexLibrary, loadPlanScreen } from './planScreen'
import styles from './plans.module.css'

export function PlanBuilderPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { state, setState, reload } = useAsync(() => loadPlanScreen(userId, id), `${userId}:${id}`)

  return (
    <section>
      <BackLink fallback="/plans" fallbackLabel="Plans" />
      {state.status === 'loading' && <LoadingScreen label="Loading plan…" />}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load this plan"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          {state.error}
        </StatusMessage>
      )}
      {state.status === 'ready' && !state.data.plan && (
        <StatusMessage title="Plan not found">
          <Link to="/plans">Back to your plans</Link>
        </StatusMessage>
      )}
      {state.status === 'ready' && state.data.plan && (
        <PlanBuilder
          userId={userId}
          plan={state.data.plan}
          library={state.data.library}
          used={state.data.used}
          onChange={(plan) => setState({ status: 'ready', data: { ...state.data, plan } })}
        />
      )}
    </section>
  )
}

function PlanBuilder({
  userId,
  plan,
  library,
  used,
  onChange,
}: {
  userId: string
  plan: PlanWithExercises
  library: Parameters<typeof indexLibrary>[0]
  /** Whether a workout used this plan; only unused plans can be deleted (FV-6). */
  used: boolean | null
  onChange: (plan: PlanWithExercises) => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const fromPlan = returnState(location, plan.name)
  const starter = useStartWorkout(() => navigate('/workout'))
  const byKey = indexLibrary(library)
  const { profile } = useProfile()
  const defaultRest = effectiveDefaultRest(plan.defaultRestSeconds, profile?.defaultRestSeconds)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await deletePlan(userId, plan.id)
      navigate('/plans', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the plan.')
      setConfirmingDelete(false)
      setBusy(false)
    }
  }

  useEffect(() => {
    document.title = `${plan.name} · FitIQ`
    return () => {
      document.title = 'FitIQ'
    }
  }, [plan.name])

  const nameOf = (index: number) => {
    const ref = plan.exercises[index].exercise
    return byKey.get(exerciseKey(ref))?.name ?? fallbackName(ref)
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    const previous = plan
    const exercises = [...plan.exercises]
    ;[exercises[index], exercises[target]] = [exercises[target], exercises[index]]
    onChange({ ...plan, exercises })
    setBusy(true)
    setError(null)
    try {
      await reorderPlanExercises(
        plan.id,
        exercises.map((e) => e.id),
      )
      setAnnouncement(`Moved ${nameOf(index)} to position ${target + 1} of ${exercises.length}.`)
    } catch (err) {
      onChange(previous)
      setError(err instanceof Error ? err.message : 'Could not save the new order.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleArchived() {
    setBusy(true)
    setError(null)
    try {
      await setPlanArchived(userId, plan.id, !plan.isArchived)
      onChange({ ...plan, isArchived: !plan.isArchived })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the plan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className={styles.titleRow}>
        <h1>{plan.name}</h1>
        {plan.isArchived && <span className={styles.badge}>Archived</span>}
      </div>
      {plan.description && <p className={styles.description}>{plan.description}</p>}
      <p className={styles.muted}>
        Default rest:{' '}
        {defaultRest === null
          ? 'off (set one in Settings or Edit details)'
          : `${formatRest(defaultRest)}${plan.defaultRestSeconds === null ? ' (from Settings)' : ' (this plan)'}`}
      </p>

      <div className={styles.actions}>
        {plan.exercises.length > 0 && !plan.isArchived && (
          <button
            type="button"
            className={controls.primary}
            disabled={starter.starting !== null}
            onClick={() => starter.start(plan)}
          >
            {starter.starting ? 'Starting…' : 'Start workout'}
          </button>
        )}
        <Link to="edit" state={fromPlan} className={controls.button}>
          Edit details
        </Link>
        <button type="button" className={controls.button} disabled={busy} onClick={toggleArchived}>
          {plan.isArchived ? 'Restore' : 'Archive'}
        </button>
        {plan.exercises.length > 0 && (
          <button
            type="button"
            className={controls.button}
            // Custom exercises are copied into the file from the library, so it must have loaded.
            disabled={library === null}
            onClick={() =>
              downloadFile(
                planFileName(plan.name),
                planFileText(plan, library),
                'application/json;charset=utf-8',
              )
            }
          >
            Share as file
          </button>
        )}
        {used === false && !confirmingDelete && (
          <button
            type="button"
            className={`${controls.button} ${styles.danger}`}
            disabled={busy}
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </button>
        )}
      </div>
      {confirmingDelete && (
        <div className={styles.confirm} role="group" aria-label="Delete this plan?">
          <p>
            Delete this plan and its exercises? No workout has used it, so nothing else changes.
            This can't be undone.
          </p>
          <button
            type="button"
            className={`${controls.button} ${styles.danger}`}
            disabled={busy}
            onClick={remove}
          >
            {busy ? 'Deleting…' : 'Delete plan'}
          </button>
          <button
            type="button"
            className={controls.button}
            onClick={() => setConfirmingDelete(false)}
          >
            Keep it
          </button>
        </div>
      )}
      {used === true && (
        <p className={styles.muted}>
          You've done a workout from this plan, so it can be archived but not deleted. That keeps
          your history linked to it.
        </p>
      )}
      {starter.error && (
        <p className={styles.error} role="alert">
          {starter.error} <Link to="/workout">Go to your workout</Link>
        </p>
      )}
      {plan.isArchived && (
        <p className={styles.muted}>
          Archived plans are hidden from your list. Workouts you've done from this plan aren't
          affected.
        </p>
      )}

      <div className={styles.sectionHeader}>
        <h2>Exercises</h2>
        <span className={styles.muted}>{exerciseCount(plan.exercises.length)}</span>
      </div>

      {library === null && (
        <p className={styles.muted}>
          Exercise details couldn't load, so some names may look odd. Your plan is safe.
        </p>
      )}

      {plan.exercises.length === 0 ? (
        <StatusMessage
          title="No exercises yet"
          action={
            <Link to="add" state={fromPlan} className={controls.primary}>
              Add exercises
            </Link>
          }
        >
          Add exercises from the library, then set target sets, reps, and rest for each one.
        </StatusMessage>
      ) : (
        <>
          <ol className={styles.exercises}>
            {plan.exercises.map((item, index) => (
              <PlanExerciseItem
                key={item.id}
                item={item}
                exercise={byKey.get(exerciseKey(item.exercise))}
                position={index + 1}
                count={plan.exercises.length}
                busy={busy}
                linkState={fromPlan}
                defaultRest={defaultRest}
                onMove={(direction) => move(index, direction)}
                onSaveTargets={async (targets) => {
                  const saved = await updatePlanExercise(userId, item.id, targets)
                  onChange({
                    ...plan,
                    exercises: plan.exercises.map((e) => (e.id === saved.id ? saved : e)),
                  })
                }}
                onRemove={async () => {
                  await removePlanExercise(userId, item.id)
                  onChange({ ...plan, exercises: plan.exercises.filter((e) => e.id !== item.id) })
                  setAnnouncement(`Removed ${nameOf(index)}.`)
                }}
              />
            ))}
          </ol>
          <Link to="add" state={fromPlan} className={controls.primary}>
            Add exercises
          </Link>
        </>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </>
  )
}
