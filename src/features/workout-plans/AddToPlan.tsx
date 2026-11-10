import { useState } from 'react'
import { Link } from 'react-router'
import { useAsync } from '../../hooks/useAsync'
import { addExerciseToPlan, listMyPlans, type Exercise, type Plan } from '../../lib/data'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { exerciseCount } from './format'
import styles from './plans.module.css'

/** "Add to plan" on an exercise detail screen (plan.md section 7, step 4.2). */
export function AddToPlan({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={controls.button}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Add to plan
      </button>
      {open && <AddToPlanPanel exercise={exercise} />}
    </>
  )
}

function AddToPlanPanel({ exercise }: { exercise: Exercise }) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { state, reload } = useAsync(() => listMyPlans(userId), userId)
  const [pending, setPending] = useState<string | null>(null)
  const [addedTo, setAddedTo] = useState<Plan | null>(null)
  /** Adds made from this panel, so the counts stay current. */
  const [extra, setExtra] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  async function add(plan: Plan) {
    setPending(plan.id)
    setError(null)
    try {
      await addExerciseToPlan(userId, plan.id, { source: exercise.source, id: exercise.id })
      setAddedTo(plan)
      setExtra((current) => ({ ...current, [plan.id]: (current[plan.id] ?? 0) + 1 }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the exercise.')
    } finally {
      setPending(null)
    }
  }

  const plans = state.status === 'ready' ? state.data.filter((plan) => !plan.isArchived) : null

  return (
    <div className={styles.panel}>
      {state.status === 'loading' && <p>Loading your plans…</p>}
      {state.status === 'error' && (
        <p role="alert">
          Couldn't load your plans.{' '}
          <button type="button" className={controls.button} onClick={reload}>
            Try again
          </button>
        </p>
      )}
      {plans && plans.length === 0 && (
        <>
          <p>You don't have any plans yet.</p>
          <Link to="/plans/new" className={controls.primary}>
            Create a plan
          </Link>
        </>
      )}
      {plans && plans.length > 0 && (
        <>
          <p id="add-to-plan-label">Add {exercise.name} to:</p>
          <ul className={styles.planChoices} aria-labelledby="add-to-plan-label">
            {plans.map((plan) => (
              <li key={plan.id}>
                <button
                  type="button"
                  className={`${controls.button} ${styles.planChoice}`}
                  disabled={pending !== null}
                  onClick={() => add(plan)}
                >
                  <span>{plan.name}</span>
                  <span className={styles.cardMeta}>
                    {pending === plan.id
                      ? 'Adding…'
                      : exerciseCount(plan.exerciseCount + (extra[plan.id] ?? 0))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {addedTo && (
        <p role="status">
          Added to {addedTo.name}. <Link to={`/plans/${addedTo.id}`}>Open plan</Link>
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
