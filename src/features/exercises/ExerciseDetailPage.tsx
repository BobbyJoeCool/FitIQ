import { Link, useParams } from 'react-router'
import { BackLink } from '../../components/common/ReturnLink'
import { ExerciseDetail } from '../../components/exercise/ExerciseDetail'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { getCatalogExercise } from '../../lib/data'
import { exerciseProgressPath } from '../progress/paths'
import { AddToPlan } from '../workout-plans/AddToPlan'
import controls from '../../styles/controls.module.css'

export function ExerciseDetailPage() {
  const { exerciseId = '' } = useParams()
  const { state, reload } = useAsync(() => getCatalogExercise(exerciseId), exerciseId)

  return (
    <section>
      <BackLink fallback="/exercises" fallbackLabel="Exercises" />
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
      {state.status === 'ready' &&
        (state.data ? (
          <ExerciseDetail
            exercise={state.data}
            actions={
              <>
                <AddToPlan exercise={state.data} />
                <Link to={exerciseProgressPath(state.data)} className={controls.button}>
                  Your history
                </Link>
              </>
            }
          />
        ) : (
          <StatusMessage title="Exercise not found">
            It may have been renamed. <Link to="/exercises">Search the library</Link>.
          </StatusMessage>
        ))}
    </section>
  )
}
