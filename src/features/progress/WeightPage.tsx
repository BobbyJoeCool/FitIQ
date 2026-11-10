import { useState, type FormEvent } from 'react'
import { LineChart } from '../../components/charts/LineChart'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { StatusMessage } from '../../components/common/StatusMessage'
import { Field } from '../../components/forms/Field'
import { useAsync } from '../../hooks/useAsync'
import {
  createWeighIn,
  deleteWeighIn,
  getWeighInSeries,
  listWeighIns,
  updateWeighIn,
  type WeighIn,
} from '../../lib/data'
import { toLocalInput, validateWeighIn, type WeighInForm } from '../../lib/entryValidation'
import { convertWeight, round, type WeightUnit } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import { longDate, shortDate, signed } from './format'
import { ProgressNav } from './ProgressNav'
import { RANGES, rangeStart, seriesChange, type RangeKey } from './progressMath'
import styles from './progress.module.css'

/** /progress/weight: log weigh-ins (6.1) and chart them over a date range (6.2). */
export function WeightPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { weightUnit } = useProfile()
  const [range, setRange] = useState<RangeKey>('90d')
  const [version, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)

  return (
    <section>
      <h1>Progress</h1>
      <ProgressNav />
      <WeighInEditor
        key={`new-${version}`}
        title="Log a weigh-in"
        weightUnit={weightUnit}
        onSave={async (input) => {
          await createWeighIn(input)
          bump()
        }}
      />
      <WeightChart
        userId={userId}
        range={range}
        setRange={setRange}
        unit={weightUnit}
        version={version}
      />
      <WeighInHistory userId={userId} unit={weightUnit} version={version} onChanged={bump} />
    </section>
  )
}

function WeightChart({
  userId,
  range,
  setRange,
  unit,
  version,
}: {
  userId: string
  range: RangeKey
  setRange: (range: RangeKey) => void
  unit: WeightUnit
  version: number
}) {
  const { state, reload } = useAsync(
    () => getWeighInSeries(userId, rangeStart(range, new Date())),
    `${userId}:${range}:${version}`,
  )
  const points =
    state.status === 'ready'
      ? state.data.map((w) => ({ date: w.recordedAt, value: convertWeight(w.value, w.unit, unit) }))
      : []
  const change = seriesChange(points)

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Weight over time</h2>
        <span className={`${styles.muted} ${styles.small}`}>in {unit}</span>
      </div>
      <div className={styles.ranges} role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`${r.key === range ? controls.primary : controls.button} ${styles.compact}`}
            aria-pressed={r.key === range}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>
      {state.status === 'loading' && <p className={styles.muted}>Loading…</p>}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load the chart"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          {state.error}
        </StatusMessage>
      )}
      {state.status === 'ready' && points.length === 0 && (
        <p className={styles.muted} style={{ margin: 0 }}>
          No weigh-ins in this range yet.
        </p>
      )}
      {points.length > 0 && (
        <>
          <LineChart
            label={`Weight in ${unit}`}
            points={points}
            formatValue={(v) => `${round(v)} ${unit}`}
            formatDate={shortDate}
          />
          {change && (
            <p className={styles.small} style={{ margin: 0 }}>
              {signed(change.change)} {unit} between the first and last weigh-in in this range (
              {change.days} days).
            </p>
          )}
          <p className={`${styles.muted} ${styles.small}`} style={{ margin: 0 }}>
            Scale weight moves day to day with water, food, and timing. Trends over weeks say more
            than any single reading, and the scale alone can't tell fat from muscle or water.
          </p>
        </>
      )}
    </div>
  )
}

function WeighInEditor({
  title,
  initial,
  weightUnit,
  onSave,
  onCancel,
}: {
  title: string
  initial?: WeighIn
  weightUnit: WeightUnit
  onSave: (input: Parameters<typeof createWeighIn>[0]) => Promise<void>
  onCancel?: () => void
}) {
  const [form, setForm] = useState<WeighInForm>(() => ({
    value: initial ? String(initial.value) : '',
    unit: initial?.unit ?? weightUnit,
    when: toLocalInput(initial ? new Date(initial.recordedAt) : new Date()),
    notes: initial?.notes ?? '',
  }))
  const [errors, setErrors] = useState<Partial<Record<keyof WeighInForm, string>>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError(null)
    const result = validateWeighIn(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await onSave(result.value)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the weigh-in.')
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
      <div className={styles.formRow}>
        <div className={styles.unitPair}>
          <Field label="Weight" error={errors.value}>
            <input
              className={controls.input}
              inputMode="decimal"
              autoComplete="off"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </Field>
          <Field label="Unit">
            <select
              className={controls.input}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value as WeightUnit })}
            >
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </select>
          </Field>
        </div>
        <Field label="When" error={errors.when}>
          <input
            className={controls.input}
            type="datetime-local"
            value={form.when}
            onChange={(e) => setForm({ ...form, when: e.target.value })}
          />
        </Field>
        <Field label="Notes (optional)" error={errors.notes}>
          <input
            className={controls.input}
            maxLength={500}
            placeholder="e.g. after breakfast"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Save weigh-in'}
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

function WeighInHistory({
  userId,
  unit,
  version,
  onChanged,
}: {
  userId: string
  unit: WeightUnit
  version: number
  onChanged: () => void
}) {
  const [page, setPage] = useState(0)
  const { state, reload } = useAsync(
    () => listWeighIns(userId, page),
    `${userId}:${page}:${version}`,
  )
  const [editing, setEditing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function remove(id: string) {
    setError(null)
    try {
      await deleteWeighIn(userId, id)
      setConfirming(null)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the weigh-in.')
    }
  }

  return (
    <div className={styles.panel}>
      <h2>History</h2>
      {state.status === 'loading' && <LoadingScreen label="Loading weigh-ins…" />}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load your weigh-ins"
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
          No weigh-ins yet. Your first one appears here and on the chart.
        </p>
      )}
      {state.status === 'ready' && state.data.items.length > 0 && (
        <ul className={styles.list}>
          {state.data.items.map((w) =>
            editing === w.id ? (
              <li key={w.id}>
                <WeighInEditor
                  title="Edit weigh-in"
                  initial={w}
                  weightUnit={unit}
                  onCancel={() => setEditing(null)}
                  onSave={async (input) => {
                    await updateWeighIn(userId, w.id, input)
                    setEditing(null)
                    onChanged()
                  }}
                />
              </li>
            ) : (
              <li key={w.id} className={styles.entry}>
                <span className={styles.entryMain}>
                  <span className={styles.entryValue}>
                    {round(w.value, 2)} {w.unit}
                    {w.unit !== unit && (
                      <span className={styles.muted}>
                        {' '}
                        ({round(convertWeight(w.value, w.unit, unit))} {unit})
                      </span>
                    )}
                  </span>
                  <span className={`${styles.muted} ${styles.small}`}>
                    {longDate(w.recordedAt)}
                    {w.notes ? ` · ${w.notes}` : ''}
                  </span>
                </span>
                {confirming === w.id ? (
                  <>
                    <button
                      type="button"
                      className={`${controls.button} ${styles.danger} ${styles.compact}`}
                      onClick={() => remove(w.id)}
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
                      aria-label={`Edit weigh-in from ${longDate(w.recordedAt)}`}
                      onClick={() => setEditing(w.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`${controls.button} ${styles.compact}`}
                      aria-label={`Delete weigh-in from ${longDate(w.recordedAt)}`}
                      onClick={() => setConfirming(w.id)}
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
