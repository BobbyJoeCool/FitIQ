import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { SetInput } from '../../lib/data'
import type { DistanceUnit, WeightUnit } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { buzz, useCountdown } from '../../hooks/useCountdown'
import { parseSet, toFields, type SetFields } from './setFields'
import type { SetMode } from './workoutMath'
import styles from './workout.module.css'

function Stepper({
  label,
  value,
  step,
  inputMode,
  onChange,
}: {
  label: string
  value: string
  step: number
  inputMode: 'numeric' | 'decimal'
  onChange: (value: string) => void
}) {
  const id = useId()
  const bump = (direction: 1 | -1) => {
    const current = Number(value) || 0
    const next = Math.max(0, Math.round((current + direction * step) * 100) / 100)
    onChange(String(next))
  }
  return (
    <div className={controls.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.stepper}>
        <button
          type="button"
          className={`${controls.button} ${styles.stepButton}`}
          aria-label={`Less ${label.toLowerCase()}`}
          onClick={() => bump(-1)}
        >
          −
        </button>
        <input
          id={id}
          className={controls.input}
          inputMode={inputMode}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className={`${controls.button} ${styles.stepButton}`}
          aria-label={`More ${label.toLowerCase()}`}
          onClick={() => bump(1)}
        >
          +
        </button>
      </div>
    </div>
  )
}

/** Counts down a hold, with a pause to switch sides when the target is per side. */
function HoldTimer({
  seconds,
  perSide,
  onDone,
}: {
  seconds: number
  perSide: boolean
  onDone: (seconds: number) => void
}) {
  const [phase, setPhase] = useState<'idle' | 'first' | 'switch' | 'second' | 'done'>('idle')
  // The countdown's done-callback starts the next phase through a ref, since it
  // can't refer to `timer` while `timer` is being created.
  const startRef = useRef<(seconds: number) => void>(() => {})
  const timer = useCountdown(() => {
    if (phase === 'first' && perSide) {
      buzz([150, 100, 150])
      setPhase('switch')
      startRef.current(5)
    } else if (phase === 'switch') {
      setPhase('second')
      startRef.current(seconds)
    } else {
      buzz([300, 100, 300])
      setPhase('done')
      onDone(seconds)
    }
  })
  useEffect(() => {
    startRef.current = timer.start
  })
  const label =
    phase === 'switch'
      ? 'Switch sides'
      : phase === 'first'
        ? perSide
          ? 'First side'
          : 'Hold'
        : phase === 'second'
          ? 'Second side'
          : phase === 'done'
            ? 'Done'
            : perSide
              ? `${seconds} s each side`
              : `${seconds} s hold`

  return (
    <div className={styles.timer} role="timer" aria-live="polite" aria-label={label}>
      <span className={styles.muted}>{label}</span>
      <span className={styles.timerValue}>
        {timer.running ? timer.remaining : phase === 'done' ? '✓' : seconds}
      </span>
      {timer.running ? (
        <button
          type="button"
          className={controls.button}
          onClick={() => {
            timer.stop()
            setPhase('idle')
          }}
        >
          Stop timer
        </button>
      ) : (
        <button
          type="button"
          className={controls.button}
          onClick={() => {
            setPhase('first')
            timer.start(seconds)
          }}
        >
          {phase === 'done' ? 'Start again' : 'Start timer'}
        </button>
      )}
    </div>
  )
}

/** Entry for one set: reps and weight, a timed hold, or cardio time and distance. */
export function SetForm({
  mode,
  title,
  initial,
  weightUnit,
  distanceUnit,
  holdSeconds,
  perSide,
  submitLabel,
  disabledReason,
  onSubmit,
  onCancel,
}: {
  mode: SetMode
  title: string
  initial: SetInput
  weightUnit: WeightUnit
  distanceUnit: DistanceUnit
  holdSeconds: number | null
  perSide: boolean
  submitLabel: string
  /** Set while saving isn't possible (offline); shown instead of submitting. */
  disabledReason?: string
  onSubmit: (input: SetInput) => Promise<void>
  onCancel?: () => void
}) {
  const [fields, setFields] = useState(() => toFields(initial))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = (key: keyof SetFields) => (value: string) =>
    setFields((f) => ({ ...f, [key]: value }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabledReason) return
    const result = parseSet(mode, fields, weightUnit, distanceUnit)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit(result.value)
    } catch (err) {
      // Keep what was typed so it can be retried without retyping (step 5.2).
      setError(
        err instanceof Error
          ? `${err.message} Your entry is kept: try again.`
          : 'Could not save the set.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.entry} onSubmit={handleSubmit} noValidate aria-label={title}>
      <p className={styles.entryTitle}>{title}</p>
      {mode === 'timed' && holdSeconds ? (
        <HoldTimer
          seconds={holdSeconds}
          perSide={perSide}
          onDone={(s) => set('seconds')(String(s))}
        />
      ) : null}
      <div className={styles.fields}>
        {mode === 'strength' && (
          <>
            <Stepper
              label="Reps"
              value={fields.reps}
              step={1}
              inputMode="numeric"
              onChange={set('reps')}
            />
            <Stepper
              label={`Weight (${weightUnit})`}
              value={fields.weight}
              step={weightUnit === 'lb' ? 5 : 2.5}
              inputMode="decimal"
              onChange={set('weight')}
            />
          </>
        )}
        {mode === 'timed' && (
          <Stepper
            label={perSide ? 'Seconds (each side)' : 'Seconds'}
            value={fields.seconds}
            step={5}
            inputMode="numeric"
            onChange={set('seconds')}
          />
        )}
        {mode === 'cardio' && (
          <>
            <Stepper
              label="Minutes"
              value={fields.minutes}
              step={1}
              inputMode="decimal"
              onChange={set('minutes')}
            />
            <Stepper
              label={`Distance (${distanceUnit})`}
              value={fields.distance}
              step={0.1}
              inputMode="decimal"
              onChange={set('distance')}
            />
          </>
        )}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {disabledReason && (
        <p className={styles.muted} style={{ margin: 0 }}>
          {disabledReason}
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="submit"
          className={`${controls.primary} ${styles.complete}`}
          disabled={saving || Boolean(disabledReason)}
          style={{ flex: '1 1 12rem' }}
        >
          {saving ? 'Saving…' : submitLabel}
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
