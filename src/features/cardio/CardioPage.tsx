import { useState, type FormEvent } from 'react'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { StatusMessage } from '../../components/common/StatusMessage'
import { Field } from '../../components/forms/Field'
import { useAsync } from '../../hooks/useAsync'
import {
  CARDIO_ACTIVITIES,
  CARDIO_LABELS,
  HAS_INCLINE,
  type CardioActivity,
} from '../../lib/cardioActivities'
import {
  createCardio,
  deleteCardio,
  listCardio,
  listCardioSince,
  updateCardio,
  type CardioInput,
  type CardioSession,
} from '../../lib/data'
import { toLocalInput, validateCardio, type CardioForm } from '../../lib/entryValidation'
import { convertDistance, distanceUnitFor, round } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import { longDate } from '../progress/format'
import { weekStart } from '../progress/progressMath'
import { formatElapsed } from '../workout-sessions/workoutMath'
import styles from '../progress/progress.module.css'

/** The walking pad preset (step 7.1): a 30-minute flat walk, distance in your unit. */
function walkingPadPreset(distanceUnit: 'mi' | 'km'): CardioForm {
  return {
    activity: 'walking_pad',
    when: toLocalInput(new Date()),
    minutes: '30',
    distance: '',
    distanceUnit,
    incline: '0',
    notes: '',
  }
}

const blankForm = (distanceUnit: 'mi' | 'km'): CardioForm => ({
  activity: 'walk',
  when: toLocalInput(new Date()),
  minutes: '',
  distance: '',
  distanceUnit,
  incline: '',
  notes: '',
})

function describe(session: CardioSession): string {
  const parts = [formatElapsed(session.durationSeconds)]
  if (session.distanceValue !== null && session.distanceUnit) {
    parts.push(`${round(session.distanceValue, 2)} ${session.distanceUnit}`)
  }
  if (session.incline) parts.push(`${round(session.incline)} % incline`)
  return parts.join(' · ')
}

/** /cardio: log sessions with a walking pad preset, and see the history (step 7.1). */
export function CardioPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { lengthUnit } = useProfile()
  const distanceUnit = distanceUnitFor(lengthUnit)
  const [version, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)

  return (
    <section>
      <h1>Cardio</h1>
      <WeekSummary userId={userId} distanceUnit={distanceUnit} version={version} />
      <CardioEditor
        key={`new-${version}`}
        title="Log cardio"
        distanceUnit={distanceUnit}
        showPresets
        onSave={async (input) => {
          await createCardio(input)
          bump()
        }}
      />
      <CardioHistory
        userId={userId}
        distanceUnit={distanceUnit}
        version={version}
        onChanged={bump}
      />
    </section>
  )
}

function WeekSummary({
  userId,
  distanceUnit,
  version,
}: {
  userId: string
  distanceUnit: 'mi' | 'km'
  version: number
}) {
  const { state } = useAsync(
    () => listCardioSince(userId, weekStart(new Date()).toISOString()),
    `${userId}:${version}`,
  )
  if (state.status !== 'ready') return null
  const seconds = state.data.reduce((n, s) => n + s.durationSeconds, 0)
  const distance = state.data.reduce(
    (n, s) =>
      s.distanceValue !== null && s.distanceUnit
        ? n + convertDistance(s.distanceValue, s.distanceUnit, distanceUnit)
        : n,
    0,
  )
  return (
    <dl className={styles.tiles}>
      <div className={styles.tile}>
        <dt>This week</dt>
        <dd>{state.data.length}</dd>
        <small>sessions since Monday</small>
      </div>
      <div className={styles.tile}>
        <dt>Time</dt>
        <dd>{seconds ? formatElapsed(seconds) : '0 min'}</dd>
      </div>
      <div className={styles.tile}>
        <dt>Distance</dt>
        <dd>
          {round(distance, 1)} {distanceUnit}
        </dd>
      </div>
    </dl>
  )
}

function CardioEditor({
  title,
  initial,
  distanceUnit,
  showPresets = false,
  onSave,
  onCancel,
}: {
  title: string
  initial?: CardioSession
  distanceUnit: 'mi' | 'km'
  showPresets?: boolean
  onSave: (input: CardioInput) => Promise<void>
  onCancel?: () => void
}) {
  const [form, setForm] = useState<CardioForm>(() =>
    initial
      ? {
          activity: initial.activity,
          when: toLocalInput(new Date(initial.startedAt)),
          minutes: String(Math.round((initial.durationSeconds / 60) * 100) / 100),
          distance: initial.distanceValue === null ? '' : String(initial.distanceValue),
          distanceUnit: initial.distanceUnit ?? distanceUnit,
          incline: initial.incline === null ? '' : String(initial.incline),
          notes: initial.notes ?? '',
        }
      : blankForm(distanceUnit),
  )
  const [errors, setErrors] = useState<Partial<Record<keyof CardioForm, string>>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof CardioForm>(key: K, value: CardioForm[K]) =>
    setForm({ ...form, [key]: value })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError(null)
    const result = validateCardio(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await onSave(result.value)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the session.')
      setSaving(false)
    }
  }

  return (
    <form
      className={`${styles.panel} ${styles.form}`}
      onSubmit={handleSubmit}
      noValidate
      aria-label={title}
    >
      <h2>{title}</h2>
      {showPresets && (
        <div className={styles.ranges}>
          <button
            type="button"
            className={controls.button}
            onClick={() => setForm(walkingPadPreset(distanceUnit))}
          >
            Walking pad preset
          </button>
        </div>
      )}
      <div className={styles.formRow}>
        <Field label="Activity">
          <select
            className={controls.input}
            value={form.activity}
            onChange={(e) => set('activity', e.target.value as CardioActivity)}
          >
            {CARDIO_ACTIVITIES.map((a) => (
              <option key={a} value={a}>
                {CARDIO_LABELS[a]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Minutes" error={errors.minutes}>
          <input
            className={controls.input}
            inputMode="decimal"
            autoComplete="off"
            value={form.minutes}
            onChange={(e) => set('minutes', e.target.value)}
          />
        </Field>
        <div className={styles.unitPair}>
          <Field label="Distance (optional)" error={errors.distance}>
            <input
              className={controls.input}
              inputMode="decimal"
              autoComplete="off"
              value={form.distance}
              onChange={(e) => set('distance', e.target.value)}
            />
          </Field>
          <Field label="Unit">
            <select
              className={controls.input}
              value={form.distanceUnit}
              onChange={(e) => set('distanceUnit', e.target.value as 'mi' | 'km')}
            >
              <option value="mi">mi</option>
              <option value="km">km</option>
            </select>
          </Field>
        </div>
        {HAS_INCLINE.includes(form.activity) && (
          <Field label="Incline % (optional)" error={errors.incline}>
            <input
              className={controls.input}
              inputMode="decimal"
              autoComplete="off"
              value={form.incline}
              onChange={(e) => set('incline', e.target.value)}
            />
          </Field>
        )}
        <Field label="When" error={errors.when}>
          <input
            className={controls.input}
            type="datetime-local"
            value={form.when}
            onChange={(e) => set('when', e.target.value)}
          />
        </Field>
        <Field label="Notes (optional)" error={errors.notes}>
          <input
            className={controls.input}
            maxLength={500}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>
      </div>
      {saveError && (
        <p className={styles.error} role="alert">
          {saveError}
        </p>
      )}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button type="submit" className={controls.primary} disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Save session'}
        </button>
        {onCancel && (
          <button type="button" className={controls.button} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function CardioHistory({
  userId,
  distanceUnit,
  version,
  onChanged,
}: {
  userId: string
  distanceUnit: 'mi' | 'km'
  version: number
  onChanged: () => void
}) {
  const [page, setPage] = useState(0)
  const { state, reload } = useAsync(() => listCardio(userId, page), `${userId}:${page}:${version}`)
  const [editing, setEditing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function remove(id: string) {
    setError(null)
    try {
      await deleteCardio(userId, id)
      setConfirming(null)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the session.')
    }
  }

  return (
    <div className={styles.panel}>
      <h2>History</h2>
      {state.status === 'loading' && <LoadingScreen label="Loading cardio…" />}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load your cardio"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          {state.error}
        </StatusMessage>
      )}
      {state.status === 'ready' && state.data.items.length === 0 && page === 0 && (
        <p className={styles.muted} style={{ margin: 0 }}>
          No cardio yet. Log a walk, a run, or a walking pad session above.
        </p>
      )}
      {state.status === 'ready' && state.data.items.length > 0 && (
        <ul className={styles.list}>
          {state.data.items.map((s) =>
            editing === s.id ? (
              <li key={s.id}>
                <CardioEditor
                  title="Edit cardio"
                  initial={s}
                  distanceUnit={distanceUnit}
                  onCancel={() => setEditing(null)}
                  onSave={async (input) => {
                    await updateCardio(userId, s.id, input)
                    setEditing(null)
                    onChanged()
                  }}
                />
              </li>
            ) : (
              <li key={s.id} className={styles.entry}>
                <span className={styles.entryMain}>
                  <span className={styles.entryValue}>
                    {CARDIO_LABELS[s.activity]} · {describe(s)}
                  </span>
                  <span className={`${styles.muted} ${styles.small}`}>
                    {longDate(s.startedAt)}
                    {s.notes ? ` · ${s.notes}` : ''}
                  </span>
                </span>
                {confirming === s.id ? (
                  <>
                    <button
                      type="button"
                      className={`${controls.button} ${styles.danger} ${styles.compact}`}
                      onClick={() => remove(s.id)}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className={`${controls.button} ${styles.compact}`}
                      onClick={() => setConfirming(null)}
                    >
                      Keep
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`${controls.button} ${styles.compact}`}
                      aria-label={`Edit ${CARDIO_LABELS[s.activity].toLowerCase()} from ${longDate(s.startedAt)}`}
                      onClick={() => setEditing(s.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`${controls.button} ${styles.compact}`}
                      aria-label={`Delete ${CARDIO_LABELS[s.activity].toLowerCase()} from ${longDate(s.startedAt)}`}
                      onClick={() => setConfirming(s.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            ),
          )}
        </ul>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {state.status === 'ready' && (page > 0 || state.data.hasMore) && (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className={controls.button}
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Newer
          </button>
          <button
            type="button"
            className={controls.button}
            disabled={!state.data.hasMore}
            onClick={() => setPage(page + 1)}
          >
            Older
          </button>
        </div>
      )}
    </div>
  )
}
