import { useState, type FormEvent } from 'react'
import { LineChart } from '../../components/charts/LineChart'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { StatusMessage } from '../../components/common/StatusMessage'
import { Field } from '../../components/forms/Field'
import { useAsync } from '../../hooks/useAsync'
import {
  createMeasurement,
  deleteMeasurement,
  listMeasurements,
  type Measurement,
  type MeasurementType,
} from '../../lib/data'
import { MEASUREMENT_TYPES } from '../../lib/measurementTypes'
import {
  MEASUREMENT_LABELS,
  toLocalInput,
  unitForType,
  validateMeasurement,
  type MeasurementForm,
} from '../../lib/entryValidation'
import { convertLength, round, type LengthUnit } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import { longDate, shortDate } from './format'
import { ProgressNav } from './ProgressNav'
import styles from './progress.module.css'

/** Converts a stored measurement to the user's length unit (percentages stay as they are). */
function display(m: Measurement, lengthUnit: LengthUnit): number {
  return m.unit === '%' ? m.value : convertLength(m.value, m.unit, lengthUnit)
}

/** /progress/measurements: log by type, with a chart per type (step 6.3). */
export function MeasurementsPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { lengthUnit } = useProfile()
  const { state, setState, reload } = useAsync(() => listMeasurements(userId), userId)
  const all = state.status === 'ready' ? state.data : []
  const byType = new Map<MeasurementType, Measurement[]>()
  for (const m of all) byType.set(m.type, [...(byType.get(m.type) ?? []), m])
  const empty = MEASUREMENT_TYPES.filter((t) => !byType.has(t))

  return (
    <section>
      <h1>Progress</h1>
      <ProgressNav />
      <MeasurementEditor
        lengthUnit={lengthUnit}
        onSave={async (input) => {
          const saved = await createMeasurement(input)
          setState({
            status: 'ready',
            data: [...all, saved].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)),
          })
        }}
      />
      {state.status === 'loading' && <LoadingScreen label="Loading measurements…" />}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load your measurements"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          {state.error}
        </StatusMessage>
      )}
      {state.status === 'ready' && all.length === 0 && (
        <StatusMessage title="No measurements yet">
          Log one above. Each type gets its own chart once it has an entry.
        </StatusMessage>
      )}
      <div className={styles.grid}>
        {MEASUREMENT_TYPES.filter((t) => byType.has(t)).map((type) => (
          <MeasurementCard
            key={type}
            type={type}
            entries={byType.get(type)!}
            lengthUnit={lengthUnit}
            onDelete={async (id) => {
              await deleteMeasurement(userId, id)
              setState({ status: 'ready', data: all.filter((m) => m.id !== id) })
            }}
          />
        ))}
      </div>
      {state.status === 'ready' && all.length > 0 && empty.length > 0 && (
        <p className={`${styles.muted} ${styles.small}`}>
          No entries yet for: {empty.map((t) => MEASUREMENT_LABELS[t].toLowerCase()).join(', ')}.
        </p>
      )}
    </section>
  )
}

function MeasurementCard({
  type,
  entries,
  lengthUnit,
  onDelete,
}: {
  type: MeasurementType
  entries: Measurement[]
  lengthUnit: LengthUnit
  onDelete: (id: string) => Promise<void>
}) {
  const unit = type === 'body_fat' ? '%' : lengthUnit
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recent = [...entries].reverse().slice(0, 5)

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>{MEASUREMENT_LABELS[type]}</h2>
        <span className={`${styles.muted} ${styles.small}`}>in {unit}</span>
      </div>
      <LineChart
        label={`${MEASUREMENT_LABELS[type]} in ${unit}`}
        points={entries.map((m) => ({ date: m.recordedAt, value: display(m, lengthUnit) }))}
        formatValue={(v) => `${round(v)} ${unit}`}
        formatDate={shortDate}
        height={160}
      />
      <ul
        className={styles.list}
        aria-label={`Recent ${MEASUREMENT_LABELS[type].toLowerCase()} entries`}
      >
        {recent.map((m) => (
          <li key={m.id} className={styles.entry}>
            <span className={styles.entryMain}>
              <span className={styles.entryValue}>
                {round(m.value, 2)} {m.unit}
              </span>
              <span className={`${styles.muted} ${styles.small}`}>{longDate(m.recordedAt)}</span>
            </span>
            {confirming === m.id ? (
              <>
                <button
                  type="button"
                  className={`${controls.button} ${styles.danger} ${styles.compact}`}
                  onClick={() =>
                    onDelete(m.id).catch((err: unknown) =>
                      setError(err instanceof Error ? err.message : 'Could not delete it.'),
                    )
                  }
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
              <button
                type="button"
                className={`${controls.button} ${styles.compact}`}
                aria-label={`Delete ${MEASUREMENT_LABELS[type].toLowerCase()} from ${longDate(m.recordedAt)}`}
                onClick={() => setConfirming(m.id)}
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function MeasurementEditor({
  lengthUnit,
  onSave,
}: {
  lengthUnit: LengthUnit
  onSave: (input: Parameters<typeof createMeasurement>[0]) => Promise<void>
}) {
  const blank = (): MeasurementForm => ({
    type: 'waist',
    value: '',
    lengthUnit,
    when: toLocalInput(new Date()),
    notes: '',
  })
  const [form, setForm] = useState<MeasurementForm>(blank)
  const [errors, setErrors] = useState<Partial<Record<keyof MeasurementForm, string>>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const unit = unitForType(form.type, form.lengthUnit)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError(null)
    setSaved(null)
    const result = validateMeasurement(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await onSave(result.value)
      setSaved(`Saved ${MEASUREMENT_LABELS[form.type].toLowerCase()}.`)
      setForm({ ...blank(), type: form.type })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the measurement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className={`${styles.panel} ${styles.form}`}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Log a measurement"
    >
      <h2>Log a measurement</h2>
      <div className={styles.formRow}>
        <Field label="Measurement">
          <select
            className={controls.input}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as MeasurementType })}
          >
            {MEASUREMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {MEASUREMENT_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <div className={styles.unitPair}>
          <Field label={`Value (${unit})`} error={errors.value}>
            <input
              className={controls.input}
              inputMode="decimal"
              autoComplete="off"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </Field>
          {form.type !== 'body_fat' ? (
            <Field label="Unit">
              <select
                className={controls.input}
                value={form.lengthUnit}
                onChange={(e) => setForm({ ...form, lengthUnit: e.target.value as LengthUnit })}
              >
                <option value="in">in</option>
                <option value="cm">cm</option>
              </select>
            </Field>
          ) : (
            <span />
          )}
        </div>
        <Field label="When" error={errors.when}>
          <input
            className={controls.input}
            type="datetime-local"
            value={form.when}
            onChange={(e) => setForm({ ...form, when: e.target.value })}
          />
        </Field>
      </div>
      {saveError && (
        <p className={styles.error} role="alert">
          {saveError}
        </p>
      )}
      {saved && (
        <p role="status" style={{ margin: 0 }}>
          {saved}
        </p>
      )}
      <div>
        <button type="submit" className={controls.primary} disabled={saving}>
          {saving ? 'Saving…' : 'Save measurement'}
        </button>
      </div>
    </form>
  )
}
