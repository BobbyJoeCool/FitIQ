import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ExerciseDetail } from '../../components/exercise/ExerciseDetail'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { getMyCustomExercise, setCustomExerciseArchived } from '../../lib/data'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { BackToExercises } from './ExerciseDetailPage'

export function CustomExerciseDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { state, setState, reload } = useAsync(
    () => getMyCustomExercise(userId, id),
    `${userId}:${id}`,
  )
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function toggleArchived(archived: boolean) {
    setBusy(true)
    setActionError(null)
    try {
      const updated = await setCustomExerciseArchived(userId, id, archived)
      setState({ status: 'ready', data: updated })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update the exercise.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <BackToExercises />
      {state.status === 'loading' && <LoadingScreen label="Loading exercise…" />}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load this exercise"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          {state.error}
        </StatusMessage>
      )}
      {state.status === 'ready' && !state.data && (
        <StatusMessage title="Exercise not found">
          <Link to="/exercises">Back to the library</Link>
        </StatusMessage>
      )}
      {state.status === 'ready' && state.data && (
        <>
          <ExerciseDetail
            exercise={state.data}
            actions={
              <>
                <Link to="edit" className={controls.button}>
                  Edit
                </Link>
                <button
                  type="button"
                  className={controls.button}
                  disabled={busy}
                  onClick={() => toggleArchived(!state.data!.isArchived)}
                >
                  {state.data.isArchived ? 'Restore' : 'Archive'}
                </button>
              </>
            }
          />
          {state.data.isArchived && (
            <p>Archived exercises are hidden from search but stay on past workouts.</p>
          )}
          {actionError && <p role="alert">{actionError}</p>}
        </>
      )}
    </section>
  )
}
