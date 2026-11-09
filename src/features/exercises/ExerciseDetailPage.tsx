import { Link, useParams } from 'react-router'
import { ExerciseDetail } from '../../components/exercise/ExerciseDetail'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { getCatalogExercise } from '../../lib/data'
import controls from '../../styles/controls.module.css'
import styles from './exercises.module.css'

export function BackToExercises() {
  return (
    <Link to=".." relative="path" className={styles.back} onClick={backIfPossible}>
      ← Exercises
    </Link>
  )
}

/** Prefer history Back so the library's search and filters come back as they were. */
function backIfPossible(event: React.MouseEvent) {
  const state = window.history.state as { idx?: number } | null
  if (state?.idx && state.idx > 0) {
    event.preventDefault()
    window.history.back()
  }
}

export function ExerciseDetailPage() {
  const { exerciseId = '' } = useParams()
  const { state, reload } = useAsync(() => getCatalogExercise(exerciseId), exerciseId)

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
      {state.status === 'ready' &&
        (state.data ? (
          <ExerciseDetail exercise={state.data} />
        ) : (
          <StatusMessage title="Exercise not found">
            It may have been renamed. <Link to="/exercises">Search the library</Link>.
          </StatusMessage>
        ))}
    </section>
  )
}
