import { Link, useParams } from 'react-router'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { BackLink } from '../../components/common/ReturnLink'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { addExerciseToPlan } from '../../lib/data'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { ExercisePicker } from './ExercisePicker'
import { exerciseKey, loadPlanScreen } from './planScreen'

/** Pick exercises from the library to add to a plan (/plans/:id/add). */
export function AddExercisesPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { state, reload } = useAsync(() => loadPlanScreen(userId, id), `${userId}:${id}`)
  const planPath = `/plans/${id}`

  return (
    <section>
      <BackLink
        fallback={planPath}
        fallbackLabel={state.status === 'ready' ? (state.data.plan?.name ?? 'Plan') : 'Plan'}
      />
      {state.status === 'loading' && <LoadingScreen label="Loading exercises…" />}
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
      {state.status === 'ready' && state.data.plan && !state.data.library && (
        <StatusMessage
          tone="error"
          title="Couldn't load the exercise library"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          Check your connection and try again.
        </StatusMessage>
      )}
      {state.status === 'ready' && state.data.plan && state.data.library && (
        <ExercisePicker
          targetName={state.data.plan.name}
          intro="Set targets for each one in the plan afterwards."
          existingKeys={new Set(state.data.plan.exercises.map((e) => exerciseKey(e.exercise)))}
          existingLabel="In plan"
          library={state.data.library}
          donePath={planPath}
          onAdd={(exercise) =>
            addExerciseToPlan(userId, id, { source: exercise.source, id: exercise.id }).then(
              () => undefined,
            )
          }
        />
      )}
    </section>
  )
}
