import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Field } from '../../components/forms/Field'
import type { Exercise, PlanExercise, PlanExerciseTargets, RestMode } from '../../lib/data'
import { resolveRest } from '../../lib/rest'
import {
  LIMITS,
  targetsToForm,
  validateTargets,
  type TargetsErrors,
  type TargetsForm,
} from '../../lib/validation'
import controls from '../../styles/controls.module.css'
import { exercisePath } from '../exercises/paths'
import { formatOffset, formatPlanTargets, formatRest } from './format'
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
  defaultRest,
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
  /** The plan's default rest, else the Settings one; null when neither is set (FV-11). */
  defaultRest: number | null
  onMove: (direction: -1 | 1) => void
  onSaveTargets: (targets: PlanExerciseTargets) => Promise<void>
  onRemove: () => Promise<void>
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-remove'>('view')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const name = exercise?.name ?? fallbackName(item.exercise)
  const summary = formatPlanTargets(item, defaultRest)

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
          defaultRest={defaultRest}
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

const REST_CHOICES: { mode: RestMode; label: string }[] = [
  { mode: 'default', label: 'Default' },
  { mode: 'offset', label: 'Default ±' },
  { mode: 'fixed', label: 'Set time' },
]

/** What the chosen rest works out to, under the choices. */
function restPreview(form: TargetsForm, defaultRest: number | null): string {
  const none =
    'No default rest is set, so this exercise has no rest timer. Set one in Settings or on the plan.'
  if (form.restMode === 'fixed') return 'Rests this long whatever the default is.'
  if (defaultRest === null) return none
  const offset = Number(form.restOffset.trim().replace('−', '-'))
  const seconds = resolveRest(
    { restMode: form.restMode, restSeconds: null, restOffsetSeconds: offset || 0 },
    defaultRest,
  )
  const result = seconds ? `rests ${formatRest(seconds)}` : 'has no rest'
  return `The default is ${formatRest(defaultRest)}, so this ${result}. It follows the default if that changes.`
}

function TargetsEditor({
  name,
  initial,
  defaultRest,
  onSave,
  onCancel,
}: {
  name: string
  initial: TargetsForm
  defaultRest: number | null
  onSave: (targets: PlanExerciseTargets) => Promise<void>
  onCancel: () => void
}) {
  const offsetId = useId()
  const restHintId = useId()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<TargetsErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = (key: Exclude<keyof TargetsForm, 'perSide' | 'restMode'>, value: string) =>
    setForm({ ...form, [key]: value })
  const bumpOffset = (direction: 1 | -1) => {
    const current = Number(form.restOffset.trim().replace('−', '-')) || 0
    const next = Math.max(-3600, Math.min(3600, current + direction * 15))
    set('restOffset', next > 0 ? `+${next}` : String(next))
  }

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
        <Field
          label="Release (sec)"
          hint="For repeated holds, like the ab roller. Reps sets how many"
          error={errors.releaseSeconds}
        >
          <input
            className={controls.input}
            inputMode="numeric"
            placeholder="5"
            value={form.releaseSeconds}
            onChange={(e) => set('releaseSeconds', e.target.value)}
          />
        </Field>
      </div>
      <fieldset className={styles.rest} aria-describedby={restHintId}>
        <legend>Rest between sets</legend>
        <div className={styles.choices}>
          {REST_CHOICES.map((choice) => (
            <label key={choice.mode} className={styles.choice}>
              <input
                type="radio"
                name={`rest-mode-${name}`}
                checked={form.restMode === choice.mode}
                onChange={() => setForm({ ...form, restMode: choice.mode })}
              />
              {choice.label}
              {choice.mode === 'default' && (
                <span className={styles.muted}>
                  {defaultRest === null ? ' (off)' : ` (${formatRest(defaultRest)})`}
                </span>
              )}
            </label>
          ))}
        </div>
        {form.restMode === 'offset' && (
          <div className={controls.field}>
            <label htmlFor={offsetId}>Seconds from the default</label>
            <div className={styles.stepper}>
              <button
                type="button"
                className={controls.button}
                aria-label="15 seconds less rest"
                onClick={() => bumpOffset(-1)}
              >
                −
              </button>
              <input
                id={offsetId}
                className={controls.input}
                inputMode="numeric"
                value={form.restOffset}
                aria-invalid={Boolean(errors.restOffset)}
                onChange={(e) => set('restOffset', e.target.value)}
              />
              <button
                type="button"
                className={controls.button}
                aria-label="15 seconds more rest"
                onClick={() => bumpOffset(1)}
              >
                +
              </button>
            </div>
            {errors.restOffset && <span className={controls.error}>{errors.restOffset}</span>}
            {!errors.restOffset && (
              <span className={controls.hint}>
                {formatOffset(Number(form.restOffset.trim().replace('−', '-')) || 0)} from the
                default
              </span>
            )}
          </div>
        )}
        {form.restMode === 'fixed' && (
          <Field label="Rest (sec)" error={errors.restSeconds}>
            <input
              className={controls.input}
              inputMode="numeric"
              placeholder="90"
              value={form.restSeconds}
              onChange={(e) => set('restSeconds', e.target.value)}
            />
          </Field>
        )}
        <p id={restHintId} className={styles.muted} style={{ margin: 0 }}>
          {restPreview(form, defaultRest)}
        </p>
      </fieldset>
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
