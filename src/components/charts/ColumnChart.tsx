import { useState, type KeyboardEvent } from 'react'
import { linear, niceTicks, tickLabel } from './scale'
import { useWidth } from './useWidth'
import styles from './charts.module.css'

export interface Column {
  /** Short axis label, e.g. "Nov 3". */
  label: string
  /** Fuller label for the tooltip and table, e.g. "Week of Nov 3". */
  fullLabel: string
  value: number
}

const PAD = { top: 12, right: 8, bottom: 28, left: 32 }

/** Columns from a zero baseline, at most 24px wide with rounded tops; hover or arrow keys read each one. */
export function ColumnChart({
  label,
  columns,
  formatValue,
  height = 180,
}: {
  label: string
  columns: Column[]
  formatValue: (value: number) => string
  height?: number
}) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  if (columns.length === 0) return null

  const max = Math.max(1, ...columns.map((c) => c.value))
  const ticks = niceTicks(0, max, 3).filter((t) => t >= 0)
  const y = linear(0, ticks[ticks.length - 1], height - PAD.bottom, PAD.top)
  const band = (width - PAD.left - PAD.right) / columns.length
  const barWidth = Math.min(24, band * 0.6)
  const labelEvery = Math.max(1, Math.ceil((columns.length * 44) / (width - PAD.left - PAD.right)))
  const base = height - PAD.bottom

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const current = active ?? columns.length - 1
    setActive(Math.max(0, Math.min(columns.length - 1, current + (e.key === 'ArrowLeft' ? -1 : 1))))
  }

  return (
    <div>
      <div
        ref={ref}
        className={styles.chart}
        tabIndex={0}
        role="group"
        aria-label={`${label} chart. Use the arrow keys to read values.`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        <svg
          className={styles.svg}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                className={styles.grid}
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(t)}
                y2={y(t)}
              />
              <text className={styles.tick} x={PAD.left - 6} y={y(t) + 4} textAnchor="end">
                {tickLabel(t)}
              </text>
            </g>
          ))}
          {columns.map((c, i) => {
            const cx = PAD.left + band * i + band / 2
            const top = y(c.value)
            const h = base - top
            const r = Math.min(4, h, barWidth / 2)
            const left = cx - barWidth / 2
            // Rounded data end, square at the baseline.
            const d =
              h <= 0
                ? ''
                : `M${left},${base}V${top + r}Q${left},${top} ${left + r},${top}H${left + barWidth - r}Q${left + barWidth},${top} ${left + barWidth},${top + r}V${base}Z`
            return (
              <g key={i}>
                {d && <path className={i === active ? styles.barActive : styles.bar} d={d} />}
                {i % labelEvery === (columns.length - 1) % labelEvery && (
                  <text className={styles.tick} x={cx} y={height - 8} textAnchor="middle">
                    {c.label}
                  </text>
                )}
                {/* The hit target is the whole band, not just the painted bar. */}
                <rect
                  x={PAD.left + band * i}
                  y={PAD.top}
                  width={band}
                  height={base - PAD.top}
                  fill="transparent"
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                />
              </g>
            )
          })}
          <line className={styles.grid} x1={PAD.left} x2={width - PAD.right} y1={base} y2={base} />
        </svg>
        {active !== null && (
          <div
            className={styles.tooltip}
            style={{
              left: Math.min(Math.max(PAD.left + band * active + band / 2, 60), width - 60),
            }}
            role="status"
          >
            <span className={styles.tooltipValue}>{formatValue(columns[active].value)}</span>
            <span className={styles.tooltipLabel}>{columns[active].fullLabel}</span>
          </div>
        )}
      </div>
      <details className={styles.table}>
        <summary>Show as table</summary>
        <table>
          <caption className="visually-hidden">{label}</caption>
          <tbody>
            {columns.map((c, i) => (
              <tr key={i}>
                <th scope="row">{c.fullLabel}</th>
                <td>{formatValue(c.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
