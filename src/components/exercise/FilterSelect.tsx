import { vocabLabel } from '../../lib/exerciseVocabulary'
import controls from '../../styles/controls.module.css'

/** A labelled exercise filter with "Any" first. Used by the library and the plan picker. */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <label className={controls.field}>
      {label}
      <select className={controls.input} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {vocabLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )
}
