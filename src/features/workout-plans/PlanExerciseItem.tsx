import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Field } from '../../components/forms/Field'
import type { Exercise, PlanExercise, PlanTargets } from '../../lib/data'
import {
  LIMITS,
  targetsToForm,
  validateTargets,
  type TargetsErrors,
  type TargetsForm,
} from '../../lib/validation'
import controls from '../../styles/controls.module.css'
import { exercisePath } from '../exercises/paths'
import { formatTargets } from './format'
import { fallbackName } from './planScreen'
import styles from './plans.module.css'

/** One exercise in the plan builder: targets, move up and down, and remove. */
export function PlanExerciseItem({
  item,
  exercise,
  position,
  count,
  busy,
  linkState,
  onMove,
  onSaveTargets,
  onRemove,
}: {
  item: PlanExercise
  /** Undefined when the exercise isn't in the library. */
  exercise: Exercise | undefined
  position: number
  count: number
  busy: boolean
  linkState: unknown
  onMove: (direction: -1 | 1) => void
  onSaveTargets: (targets: PlanTargets) => Promise<void>
  onRemove: () => Promise<void>
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-remove'>('view')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const name = exercise?.name ?? fallbackName(item.exercise)
  const summary = formatTargets(item)

  async function remove() {
    setRemoving(true)
    setError(null)
    try {
      await onRemove()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the exercise.')
      setRemoving(false)
    }
  }

  return (
    <li className={styles.item}>
      <div className={styles.itemMain}>
        <span className={styles.position} aria-hidden="true">
          {position}
        </span>
        <div className={styles.itemBody}>
          {exercise ? (
            <Link to={exercisePath(item.exercise)} state={linkState} className={styles.itemName}>
              {name}
            </Link>
          ) : (
            <span className={styles.itemName}>{name}</span>
          )}
          <span className={styles.cardMeta}>{summary ?? 'No targets yet'}</span>
          {item.notes && <p className={styles.notes}>{item.notes}</p>}
          {(exercise?.isArchived || !exercise) && (
            <span className={styles.badges}>
              {exercise?.isArchived && <span className={styles.badge}>Archived exercise</span>}
              {!exercise && <span className={styles.badge}>Details unavailable</span>}
            </span>
          )}
        </div>
      </div>

      {mode === 'view' && (
        <div className={styles.itemActions}>
          <button
            type="button"
            className={`${controls.button} ${styles.iconButton}`}
            aria-label={`Move ${name} up`}
            disabled={busy || position === 1}
            onClick={() => onMove(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            className={`${controls.button} ${styles.iconButton}`}
            aria-label={`Move ${name} down`}
            disabled={busy || position === count}
            onClick={() => onMove(1)}
          >
            ↓
          </button>
          <button
            type="button"
            className={controls.button}
            aria-label={`Edit targets for ${name}`}
            onClick={() => setMode('edit')}
          >
            Edit targets
          </button>
          <button
            type="button"
            className={controls.button}
            aria-label={`Remove ${name}`}
            onClick={() => setMode('confirm-remove')}
          >
            Remove
          </button>
        </div>
      )}

      {mode === 'edit' && (
        <TargetsEditor
          name={name}
          initial={targetsToForm(item)}
          onCancel={() => setMode('view')}
          onSave={async (targets) => {
            await onSaveTargets(targets)
            setMode('view')
          }}
        />
      )}

      {mode === 'confirm-remove' && (
        <div className={styles.confirm} role="group" aria-label={`Remove ${name}?`}>
          <p>Remove {name} from this plan? Past workouts aren't affected.</p>
          <button
            type="button"
            className={`${controls.button} ${styles.danger}`}
            disabled={removing}
            onClick={remove}
          >
            {removing ? 'Removing…' : 'Remove'}
          </button>
          <button type="button" className={controls.button} onClick={() => setMode('view')}>
            Keep
          </button>
        </div>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </li>
  )
}

function TargetsEditor({
  name,
  initial,
  onSave,
  onCancel,
}: {
  name: string
  initial: TargetsForm
  onSave: (targets: PlanTargets) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<TargetsErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = (key: Exclude<keyof TargetsForm, 'perSide'>, value: string) =>
    setForm({ ...form, [key]: value })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError(null)
    const result = validateTargets(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await onSave(result.value)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the targets.')
      setSaving(false)
    }
  }

  return (
    <form
      className={styles.editor}
      onSubmit={handleSubmit}
      noValidate
      aria-label={`Targets for ${name}`}
    >
      <div className={styles.editorRow}>
        <Field label="Sets" error={errors.targetSets}>
          <input
            className={controls.input}
            inputMode="numeric"
            placeholder="3"
            value={form.targetSets}
            onChange={(e) => set('targetSets', e.target.value)}
          />
        </Field>
        <Field label="Reps" error={errors.targetReps}>
          <input
            className={controls.input}
            placeholder="8-12"
            maxLength={LIMITS.targetRepsMax}
            value={form.targetReps}
            onChange={(e) => set('targetReps', e.target.value)}
          />
        </Field>
        <Field label="Rest (sec)" error={errors.restSeconds}>
          <input
            className={controls.input}
            inputMode="numeric"
            placeholder="90"
            value={form.restSeconds}
            onChange={(e) => set('restSeconds', e.target.value)}
          />
        </Field>
        <Field
          label="Hold (sec)"
          hint="For timed exercises like stretches"
          error={errors.targetSeconds}
        >
          <input
            className={controls.input}
            inputMode="numeric"
            placeholder="30"
            value={form.targetSeconds}
            onChange={(e) => set('targetSeconds', e.target.value)}
          />
        </Field>
      </div>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={form.perSide}
          onChange={(e) => setForm({ ...form, perSide: e.target.checked })}
        />
        Each side (left and right)
      </label>
      <Field label="Notes (optional)" error={errors.notes}>
        <textarea
          className={controls.input}
          rows={2}
          maxLength={LIMITS.planNotesMax}
          placeholder="e.g. Pause at the bottom"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </Field>
      {saveError && (
        <p className={styles.error} role="alert">
          {saveError}
        </p>
      )}
      <div className={styles.formActions}>
        <button type="submit" className={controls.primary} disabled={saving}>
          {saving ? 'Saving…' : 'Save targets'}
        </button>
        <button type="button" className={controls.button} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
