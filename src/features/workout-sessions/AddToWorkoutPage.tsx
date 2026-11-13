import { Link } from 'react-router'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { BackLink } from '../../components/common/ReturnLink'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { addSessionExercise, getInProgressSession, loadExerciseLibrary } from '../../lib/data'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import { ExercisePicker } from '../workout-plans/ExercisePicker'
import { exerciseKey } from '../workout-plans/planScreen'

/** /workout/add: add exercises to the workout in progress (step 5.3). */
export function AddToWorkoutPage() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const userId = user?.id ?? ''
  const { state, reload } = useAsync(
    () => Promise.all([getInProgressSession(userId), loadExerciseLibrary(userId)]),
    userId,
  )

  return (
    <section>
      <BackLink fallback="/workout" fallbackLabel="Workout" />
      {state.status === 'loading' && <LoadingScreen label="Loading exercises…" />}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load the exercise library"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          {state.error}
        </StatusMessage>
      )}
      {state.status === 'ready' && !state.data[0] && (
        <StatusMessage title="No workout in progress">
          <Link to="/workout">Start a workout</Link> first.
        </StatusMessage>
      )}
      {state.status === 'ready' && state.data[0] && (
        <ExercisePicker
          targetName={state.data[0].name}
          intro="Each one goes at the end of the workout."
          existingKeys={new Set(state.data[0].exercises.map((e) => exerciseKey(e.exercise)))}
          existingLabel="In workout"
          library={state.data[1]}
          donePath="/workout"
          onAdd={async (exercise) => {
            await addSessionExercise(
              userId,
              state.data[0]!.id,
              { source: exercise.source, id: exercise.id },
              exercise.name,
              // Added mid-workout, so it follows the Settings default rest (FV-11).
              profile?.defaultRestSeconds ?? null,
            )
          }}
        />
      )}
    </section>
  )
}
