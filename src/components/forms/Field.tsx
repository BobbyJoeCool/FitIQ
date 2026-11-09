import { useId, type ReactElement, cloneElement } from 'react'
import controls from '../../styles/controls.module.css'

/**
 * A labelled form control. The hint and error are linked with
 * aria-describedby rather than nested in the label, so the control's
 * accessible name stays just the label.
 */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactElement<Record<string, unknown>>
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={controls.field}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
      })}
      {hint && (
        <span id={hintId} className={controls.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className={controls.error}>
          {error}
        </span>
      )}
    </div>
  )
}
