import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { SetInput } from '../../lib/data'
import type { DistanceUnit, WeightUnit } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { buzz, useCountdown } from '../../hooks/useCountdown'
import { playTone, speak, unlockAudio } from '../../lib/sound/cues'
import { formatDuration } from '../workout-plans/format'
import { parseSet, toFields, type SetFields } from './setFields'
import {
  buildTimerSteps,
  countdownTone,
  cueForStep,
  DONE_CUE,
  timerSummary,
  type TimerStep,
} from './timerSteps'
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

/**
 * Counts down a timed set from the Seconds field: one hold, or repeated holds
 * with a release between them, per side with a pause to switch.
 */
function HoldTimer({
  seconds,
  perSide,
  releaseSeconds,
  holds,
  isStretch,
}: {
  seconds: number | null
  perSide: boolean
  releaseSeconds: number | null
  holds: number
  /** Stretches say "Stretch" rather than "Hold" (FV-14). */
  isStretch: boolean
}) {
  // -1 before starting; steps.length once finished.
  const [index, setIndex] = useState(-1)
  // The sequence is fixed when the timer starts, so editing the fields mid-set can't scramble it.
  const [steps, setSteps] = useState<TimerStep[]>([])
  const startRef = useRef<(seconds: number) => void>(() => {})
  const timer = useCountdown(() => {
    const next = index + 1
    setIndex(next)
    if (next < steps.length) {
      buzz(steps[next].kind === 'hold' ? [150, 100, 150] : 150)
      speak(cueForStep(steps[next], isStretch))
      startRef.current(steps[next].seconds)
    } else {
      buzz([300, 100, 300])
      speak(DONE_CUE)
    }
  })
  useEffect(() => {
    startRef.current = timer.start
  })
  // The soft 3, 2, 1 before each change (FV-14), once per second.
  const step = timer.running ? steps[index] : undefined
  const tonedRef = useRef('')
  useEffect(() => {
    if (!step || !countdownTone(step.seconds, timer.remaining)) return
    const key = `${index}:${timer.remaining}`
    if (tonedRef.current === key) return
    tonedRef.current = key
    playTone(timer.remaining === 1)
  }, [step, index, timer.remaining])
  const done = index >= 0 && index >= steps.length
  const label = timer.running
    ? steps[index].label
    : done
      ? 'Done'
      : timerSummary({ seconds, perSide, releaseSeconds, holds })

  return (
    <div className={styles.timer} role="timer" aria-live="polite" aria-label={label}>
      <span className={styles.muted}>{label}</span>
      <span className={styles.timerValue}>
        {timer.running ? timer.remaining : done ? '✓' : (seconds ?? '–')}
      </span>
      {timer.running ? (
        <button
          type="button"
          className={controls.button}
          onClick={() => {
            timer.stop()
            setIndex(-1)
          }}
        >
          Stop timer
        </button>
      ) : (
        <button
          type="button"
          className={controls.button}
          disabled={!seconds}
          onClick={() => {
            if (!seconds) return
            // This tap unlocks sound on iPhone for the rest of the set (FV-14).
            unlockAudio()
            const sequence = buildTimerSteps({ seconds, perSide, releaseSeconds, holds })
            speak(cueForStep(sequence[0], isStretch))
            setSteps(sequence)
            setIndex(0)
            timer.start(sequence[0].seconds)
          }}
        >
          {done ? 'Start again' : 'Start timer'}
        </button>
      )}
    </div>
  )
}

/** A whole number from typed text within 1..max, else null. */
function wholeIn(text: string, max: number): number | null {
  const t = text.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n >= 1 && n <= max ? n : null
}

/** Entry for one set: reps and weight, a timed hold, or cardio time and distance. */
export function SetForm({
  mode,
  title,
  initial,
  weightUnit,
  distanceUnit,
  showTimer,
  perSide,
  releaseSeconds = null,
  isStretch = false,
  submitLabel,
  disabledReason,
  rest,
  onSubmit,
  onCancel,
}: {
  mode: SetMode
  title: string
  initial: SetInput
  weightUnit: WeightUnit
  distanceUnit: DistanceUnit
  /** Show the hold timer for a timed set (not when editing a saved set). */
  showTimer: boolean
  /** The plan's per-side setting, the starting value of the Each side toggle. */
  perSide: boolean
  /** Release between repeated holds; with it, the set also records how many holds (reps). */
  releaseSeconds?: number | null
  /** A stretch: the timer's voice says "Stretch" rather than "Hold". */
  isStretch?: boolean
  submitLabel: string
  /** Set while saving isn't possible (offline); shown instead of submitting. */
  disabledReason?: string
  /** While resting, the rest countdown takes the place of the submit button. */
  rest?: { remaining: number; onSkip: () => void } | null
  onSubmit: (input: SetInput) => Promise<void>
  onCancel?: () => void
}) {
  const [fields, setFields] = useState(() => toFields(initial))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Each side can be changed for this set only; the plan stays as it is (issue #70).
  const [sides, setSides] = useState(perSide)
  const set = (key: keyof SetFields) => (value: string) =>
    setFields((f) => ({ ...f, [key]: value }))
  const intervals = mode === 'timed' && Boolean(releaseSeconds)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabledReason) return
    // Unlocks sound for the rest timer that starts once the set saves (FV-14).
    unlockAudio()
    const result = parseSet(mode, fields, weightUnit, distanceUnit, { holdsAsReps: intervals })
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
      {mode === 'timed' && showTimer && (
        <HoldTimer
          seconds={wholeIn(fields.seconds, 3600)}
          perSide={sides}
          releaseSeconds={intervals ? releaseSeconds : null}
          holds={wholeIn(fields.reps, 100) ?? 1}
          isStretch={isStretch}
        />
      )}
      {mode === 'timed' && (
        <label className={styles.checkbox}>
          <input type="checkbox" checked={sides} onChange={(e) => setSides(e.target.checked)} />
          Each side (left and right)
        </label>
      )}
      <div className={styles.fields}>
        {mode === 'strength' && (
          <>
            <label className={`${styles.checkbox} ${styles.wide}`}>
              <input
                type="checkbox"
                checked={fields.bodyweight}
                // Switching to body weight clears the barbell-style weight; any added weight is typed fresh.
                onChange={(e) => {
                  const bodyweight = e.target.checked
                  setFields((f) => ({ ...f, bodyweight, weight: bodyweight ? '' : f.weight }))
                }}
              />
              Body weight
            </label>
            <Stepper
              label="Reps"
              value={fields.reps}
              step={1}
              inputMode="numeric"
              onChange={set('reps')}
            />
            <Stepper
              label={
                fields.bodyweight
                  ? `Added weight (${weightUnit}, optional)`
                  : `Weight (${weightUnit})`
              }
              value={fields.weight}
              step={weightUnit === 'lb' ? 5 : 2.5}
              inputMode="decimal"
              onChange={set('weight')}
            />
          </>
        )}
        {intervals && (
          <Stepper
            label="Reps (holds)"
            value={fields.reps}
            step={1}
            inputMode="numeric"
            onChange={set('reps')}
          />
        )}
        {mode === 'timed' && (
          <Stepper
            label={sides ? 'Seconds (each side)' : 'Seconds'}
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
        {rest ? (
          <div className={styles.rest} role="timer" aria-label="Rest timer">
            <span>
              Rest <span className={styles.restTime}>{formatDuration(rest.remaining)}</span>
            </span>
            <button type="button" className={styles.skipRest} onClick={rest.onSkip}>
              Skip rest
            </button>
          </div>
        ) : (
          <button
            type="submit"
            className={`${controls.primary} ${styles.complete}`}
            disabled={saving || Boolean(disabledReason)}
            style={{ flex: '1 1 12rem' }}
          >
            {saving ? 'Saving…' : submitLabel}
          </button>
        )}
        {onCancel && (
          <button type="button" className={controls.button} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
