import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ReturnLink } from '../../components/common/ReturnLink'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { Field } from '../../components/forms/Field'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { useReturnTo } from '../../hooks/useReturnTo'
import {
  createCustomExercise,
  getMyCustomExercise,
  updateCustomExercise,
  type Exercise,
} from '../../lib/data'
import {
  DIFFICULTIES,
  EQUIPMENT,
  MOVEMENT_TYPES,
  MUSCLES,
  vocabLabel,
} from '../../lib/exerciseVocabulary'
import {
  LIMITS,
  validateCustomExercise,
  type CustomExerciseErrors,
  type CustomExerciseForm,
} from '../../lib/validation'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import styles from './exercises.module.css'

const EMPTY_FORM: CustomExerciseForm = {
  name: '',
  description: '',
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: '',
  difficulty: '',
  movementType: '',
  videoUrl: '',
  videoSourceName: '',
}

function toForm(exercise: Exercise): CustomExerciseForm {
  return {
    name: exercise.name,
    description: exercise.description ?? '',
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    equipment: exercise.equipment ?? '',
    difficulty: exercise.difficulty ?? '',
    movementType: exercise.movementType ?? '',
    videoUrl: exercise.videoUrl ?? '',
    videoSourceName: exercise.videoSourceName ?? '',
  }
}

export function CustomExerciseFormPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const editing = Boolean(id)
  const { state } = useAsync(
    () => (id ? getMyCustomExercise(userId, id) : Promise.resolve(null)),
    `${userId}:${id ?? 'new'}`,
  )

  if (editing && state.status === 'loading') return <LoadingScreen />
  if (editing && state.status === 'error') {
    return (
      <StatusMessage tone="error" title="Couldn't load this exercise">
        {state.error}
      </StatusMessage>
    )
  }
  if (editing && state.status === 'ready' && !state.data) {
    return (
      <StatusMessage title="Exercise not found">
        <Link to="/exercises">Back to the library</Link>
      </StatusMessage>
    )
  }
  const existing = state.status === 'ready' ? state.data : null
  return <ExerciseForm key={existing?.id ?? 'new'} userId={userId} existing={existing} />
}

function MuscleChoices({
  legend,
  name,
  selected,
  disabled = [],
  error,
  onChange,
}: {
  legend: string
  name: string
  selected: string[]
  disabled?: string[]
  error?: string
  onChange: (next: string[]) => void
}) {
  return (
    <fieldset className={styles.fieldset} aria-invalid={Boolean(error)}>
      <legend>{legend}</legend>
      <div className={styles.choices}>
        {MUSCLES.map((muscle) => (
          <label key={muscle} className={styles.checkbox}>
            <input
              type="checkbox"
              name={name}
              value={muscle}
              checked={selected.includes(muscle)}
              disabled={disabled.includes(muscle)}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...selected, muscle] : selected.filter((m) => m !== muscle),
                )
              }
            />
            {vocabLabel(muscle)}
          </label>
        ))}
      </div>
      {error && <p className={controls.error}>{error}</p>}
    </fieldset>
  )
}

function SelectField({
  label,
  value,
  options,
  error,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <Field label={label} error={error}>
      <select className={controls.input} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Not set</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {vocabLabel(option)}
          </option>
        ))}
      </select>
    </Field>
  )
}

function ExerciseForm({ userId, existing }: { userId: string; existing: Exercise | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { leave } = useReturnTo()
  const [form, setForm] = useState<CustomExerciseForm>(existing ? toForm(existing) : EMPTY_FORM)
  const [errors, setErrors] = useState<CustomExerciseErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    document.title = existing ? `Edit ${existing.name} · FitIQ` : 'New exercise · FitIQ'
    return () => {
      document.title = 'FitIQ'
    }
  }, [existing])

  const set = <K extends keyof CustomExerciseForm>(key: K, value: CustomExerciseForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError(null)
    const result = validateCustomExercise(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      if (existing) {
        await updateCustomExercise(userId, existing.id, result.value)
        // Back to the detail page it was opened from, which reloads the exercise.
        leave(`/exercises/custom/${existing.id}`)
      } else {
        const saved = await createCustomExercise(result.value)
        // Replace the form, keeping where it was opened from for the back link.
        navigate(`/exercises/custom/${saved.id}`, { replace: true, state: location.state })
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the exercise.')
      setSaving(false)
    }
  }

  const cancelTo = existing ? `/exercises/custom/${existing.id}` : '/exercises'

  return (
    <section>
      <h1>{existing ? 'Edit exercise' : 'New exercise'}</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>Only you can see the exercises you create.</p>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field label="Name" error={errors.name}>
          <input
            className={controls.input}
            value={form.name}
            maxLength={LIMITS.nameMax}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>

        <MuscleChoices
          legend="Primary muscles"
          name="primaryMuscles"
          selected={form.primaryMuscles}
          error={errors.primaryMuscles}
          onChange={(next) => set('primaryMuscles', next)}
        />
        <MuscleChoices
          legend="Secondary muscles (optional)"
          name="secondaryMuscles"
          selected={form.secondaryMuscles}
          disabled={form.primaryMuscles}
          error={errors.secondaryMuscles}
          onChange={(next) => set('secondaryMuscles', next)}
        />

        <div className={styles.row}>
          <SelectField
            label="Equipment"
            value={form.equipment}
            options={EQUIPMENT}
            error={errors.equipment}
            onChange={(v) => set('equipment', v)}
          />
          <SelectField
            label="Movement type"
            value={form.movementType}
            options={MOVEMENT_TYPES}
            error={errors.movementType}
            onChange={(v) => set('movementType', v)}
          />
          <SelectField
            label="Difficulty"
            value={form.difficulty}
            options={DIFFICULTIES}
            error={errors.difficulty}
            onChange={(v) => set('difficulty', v)}
          />
        </div>

        <Field label="Notes (optional)" error={errors.description}>
          <textarea
            className={controls.input}
            rows={4}
            value={form.description}
            maxLength={LIMITS.descriptionMax}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        <Field
          label="Video link (optional)"
          hint="YouTube links play in the app when you tap them; other links open the site."
          error={errors.videoUrl}
        >
          <input
            className={controls.input}
            type="url"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={form.videoUrl}
            onChange={(e) => set('videoUrl', e.target.value)}
          />
        </Field>

        {form.videoUrl.trim() && (
          <Field label="Video source name (optional)" error={errors.videoSourceName}>
            <input
              className={controls.input}
              placeholder="e.g. Coach's channel"
              value={form.videoSourceName}
              maxLength={LIMITS.videoSourceNameMax}
              onChange={(e) => set('videoSourceName', e.target.value)}
            />
          </Field>
        )}

        {saveError && (
          <p className={controls.error} role="alert">
            {saveError}
          </p>
        )}

        <div className={styles.formActions}>
          <button type="submit" className={controls.primary} disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Create exercise'}
          </button>
          <ReturnLink fallback={cancelTo} replace className={controls.button}>
            Cancel
          </ReturnLink>
        </div>
      </form>
    </section>
  )
}
