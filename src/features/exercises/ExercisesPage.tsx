import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { ExerciseCard } from '../../components/exercise/ExerciseCard'
import { FilterSelect } from '../../components/exercise/FilterSelect'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { returnState } from '../../hooks/useReturnTo'
import { loadExerciseLibrary } from '../../lib/data'
import { DIFFICULTIES, EQUIPMENT, MOVEMENT_TYPES, MUSCLES } from '../../lib/exerciseVocabulary'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import {
  EMPTY_FILTERS,
  filterExercises,
  hasActiveFilters,
  type ExerciseFilters,
} from './filterExercises'
import styles from './exercises.module.css'

const PAGE_SIZE = 40

/** Filters live in the URL so Back from a detail screen restores them. */
function readFilters(params: URLSearchParams): ExerciseFilters {
  return {
    query: params.get('q') ?? '',
    muscle: params.get('muscle') ?? '',
    equipment: params.get('equipment') ?? '',
    movementType: params.get('type') ?? '',
    difficulty: params.get('difficulty') ?? '',
    showArchived: params.get('archived') === '1',
  }
}

function writeFilters(filters: ExerciseFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query) params.set('q', filters.query)
  if (filters.muscle) params.set('muscle', filters.muscle)
  if (filters.equipment) params.set('equipment', filters.equipment)
  if (filters.movementType) params.set('type', filters.movementType)
  if (filters.difficulty) params.set('difficulty', filters.difficulty)
  if (filters.showArchived) params.set('archived', '1')
  return params
}

export function ExercisesPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { state, reload } = useAsync(() => loadExerciseLibrary(userId), userId)
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const fromLibrary = returnState(location, 'Exercises')
  const filters = readFilters(params)
  const [shown, setShown] = useState(PAGE_SIZE)

  const update = (patch: Partial<ExerciseFilters>) => {
    setParams(writeFilters({ ...filters, ...patch }), { replace: true })
    setShown(PAGE_SIZE)
  }

  const exercises = state.status === 'ready' ? state.data : null
  // Filtering ~900 exercises is cheap enough to do on every render.
  const results = exercises ? filterExercises(exercises, filters) : []
  const archivedCount = exercises?.filter((e) => e.isArchived).length ?? 0

  return (
    <section>
      <div className={styles.header}>
        <h1>Exercises</h1>
        <Link to="/exercises/custom/new" state={fromLibrary} className={controls.primary}>
          New exercise
        </Link>
      </div>

      <div className={styles.filters} role="search">
        <label className={controls.field}>
          Search
          <input
            className={controls.input}
            type="search"
            placeholder="Search by name, e.g. squat"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
          />
        </label>
        <div className={styles.filterRow}>
          <FilterSelect
            label="Muscle"
            value={filters.muscle}
            options={MUSCLES}
            onChange={(muscle) => update({ muscle })}
          />
          <FilterSelect
            label="Equipment"
            value={filters.equipment}
            options={EQUIPMENT}
            onChange={(equipment) => update({ equipment })}
          />
          <FilterSelect
            label="Movement type"
            value={filters.movementType}
            options={MOVEMENT_TYPES}
            onChange={(movementType) => update({ movementType })}
          />
          <FilterSelect
            label="Difficulty"
            value={filters.difficulty}
            options={DIFFICULTIES}
            onChange={(difficulty) => update({ difficulty })}
          />
        </div>
        <div className={styles.filterFooter}>
          <span aria-live="polite">
            {exercises ? `${results.length} of ${exercises.length - archivedCount} exercises` : ''}
          </span>
          <span>
            {archivedCount > 0 && (
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={filters.showArchived}
                  onChange={(e) => update({ showArchived: e.target.checked })}
                />
                Show archived ({archivedCount})
              </label>
            )}
            {hasActiveFilters(filters) && (
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => update(EMPTY_FILTERS)}
              >
                Clear filters
              </button>
            )}
          </span>
        </div>
      </div>

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

      {exercises && results.length === 0 && (
        <StatusMessage
          title="No exercises match"
          action={
            hasActiveFilters(filters) ? (
              <button
                type="button"
                className={controls.button}
                onClick={() => update(EMPTY_FILTERS)}
              >
                Clear filters
              </button>
            ) : undefined
          }
        >
          Try fewer filters or a shorter search, or create your own exercise.
        </StatusMessage>
      )}

      {results.length > 0 && (
        <>
          <ul className={styles.results}>
            {results.slice(0, shown).map((exercise) => (
              <li key={`${exercise.source}:${exercise.id}`}>
                <ExerciseCard exercise={exercise} linkState={fromLibrary} />
              </li>
            ))}
          </ul>
          {shown < results.length && (
            <div className={styles.more}>
              <button
                type="button"
                className={controls.button}
                onClick={() => setShown((n) => n + PAGE_SIZE)}
              >
                Show more ({results.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
