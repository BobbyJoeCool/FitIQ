import { LoadingScreen } from '../../components/common/LoadingScreen'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { getInProgressSession, loadExerciseLibrary } from '../../lib/data'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { ActiveWorkout } from './ActiveWorkout'
import { StartWorkout } from './StartWorkout'

async function loadWorkoutScreen(userId: string) {
  const [session, library] = await Promise.all([
    getInProgressSession(userId),
    // The workout still works without exercise details (names are copied).
    loadExerciseLibrary(userId).catch(() => null),
  ])
  return { session, library }
}

/** /workout: the workout in progress, or a way to start one. */
export function WorkoutPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { state, setState, reload } = useAsync(() => loadWorkoutScreen(userId), userId)

  if (state.status === 'loading') return <LoadingScreen label="Loading your workout…" />
  if (state.status === 'error') {
    return (
      <StatusMessage
        tone="error"
        title="Couldn't load your workout"
        action={
          <button type="button" className={controls.button} onClick={reload}>
            Try again
          </button>
        }
      >
        {state.error}
      </StatusMessage>
    )
  }
  if (!state.data.session) return <StartWorkout onStarted={reload} />
  return (
    <ActiveWorkout
      session={state.data.session}
      library={state.data.library}
      onChange={(session) => setState({ status: 'ready', data: { ...state.data, session } })}
      onEnded={reload}
    />
  )
}
