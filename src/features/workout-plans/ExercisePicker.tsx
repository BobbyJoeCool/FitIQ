import { useState } from 'react'
import { ReturnLink } from '../../components/common/ReturnLink'
import { StatusMessage } from '../../components/common/StatusMessage'
import { FilterSelect } from '../../components/exercise/FilterSelect'
import type { Exercise } from '../../lib/data'
import { EQUIPMENT, MOVEMENT_TYPES, MUSCLES, vocabLabel } from '../../lib/exerciseVocabulary'
import controls from '../../styles/controls.module.css'
import { EMPTY_FILTERS, filterExercises } from '../exercises/filterExercises'
import { exerciseKey } from './planScreen'
import styles from './plans.module.css'

const PAGE_SIZE = 40

/**
 * Search the library and add exercises one by one, to a plan or a workout.
 * `existing` marks exercises already there ("In plan"); `onAdd` saves one.
 */
export function ExercisePicker({
  targetName,
  intro,
  existingKeys,
  existingLabel,
  library,
  donePath,
  onAdd,
}: {
  targetName: string
  intro: string
  existingKeys: Set<string>
  existingLabel: string
  library: Exercise[]
  donePath: string
  onAdd: (exercise: Exercise) => Promise<void>
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [shown, setShown] = useState(PAGE_SIZE)
  /** How many times each exercise was added during this visit. */
  const [added, setAdded] = useState<Record<string, number>>({})
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const totalAdded = Object.values(added).reduce((sum, n) => sum + n, 0)
  const inPlan = existingKeys

  // Archived custom exercises stay out, as in library search.
  const results = filterExercises(library, filters)
  const update = (patch: Partial<typeof filters>) => {
    setFilters({ ...filters, ...patch })
    setShown(PAGE_SIZE)
  }

  async function add(exercise: Exercise) {
    const key = exerciseKey(exercise)
    setPending(key)
    setError(null)
    try {
      await onAdd(exercise)
      setAdded((current) => ({ ...current, [key]: (current[key] ?? 0) + 1 }))
      setAnnouncement(`Added ${exercise.name} to ${targetName}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the exercise.')
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <h1>Add exercises</h1>
      <p className={styles.muted}>
        To <strong>{targetName}</strong>. {intro}
      </p>

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
        </div>
        <span className={styles.muted} aria-live="polite">
          {results.length} exercises
        </span>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {results.length === 0 ? (
        <StatusMessage title="No exercises match">
          Try a shorter search or fewer filters.
        </StatusMessage>
      ) : (
        <ul className={styles.list}>
          {results.slice(0, shown).map((exercise) => {
            const key = exerciseKey(exercise)
            const count = added[key] ?? 0
            const already = count > 0 || inPlan.has(key)
            const meta = [
              exercise.primaryMuscles.map(vocabLabel).join(', '),
              exercise.equipment && vocabLabel(exercise.equipment),
            ]
              .filter(Boolean)
              .join(' · ')
            return (
              <li key={key} className={styles.pickRow}>
                <span className={styles.pickInfo}>
                  <span className={styles.cardTitle}>{exercise.name}</span>
                  <span className={styles.cardMeta}>
                    {exercise.source === 'custom' ? `Custom · ${meta}` : meta}
                  </span>
                </span>
                <span className={styles.pickAction}>
                  {count > 0 && (
                    <span className={styles.added}>Added{count > 1 ? ` ×${count}` : ''}</span>
                  )}
                  {count === 0 && inPlan.has(key) && (
                    <span className={styles.muted}>{existingLabel}</span>
                  )}
                  <button
                    type="button"
                    className={already ? controls.button : controls.primary}
                    aria-label={`${already ? 'Add again' : 'Add'}: ${exercise.name}`}
                    disabled={pending !== null}
                    onClick={() => add(exercise)}
                  >
                    {pending === key ? 'Adding…' : already ? 'Add again' : 'Add'}
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}

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

      <div className={styles.stickyDone}>
        <ReturnLink fallback={donePath} replace className={controls.primary}>
          {totalAdded > 0 ? `Done (${totalAdded} added)` : 'Done'}
        </ReturnLink>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </>
  )
}
