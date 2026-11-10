import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { linear, niceTicks, tickLabel } from './scale'
import { useWidth } from './useWidth'
import styles from './charts.module.css'

export interface LinePoint {
  date: string
  value: number
}

const PAD = { top: 16, right: 64, bottom: 28, left: 44 }

/**
 * One series over time: 2px line, a light area wash, and the latest value
 * labelled at the end. Hover or arrow keys move a crosshair that reads out
 * the nearest point; "Show as table" lists every value.
 */
export function LineChart({
  label,
  points,
  formatValue,
  formatDate,
  height = 220,
}: {
  /** What is plotted, for the accessible name and the table caption. */
  label: string
  /** Oldest first. */
  points: LinePoint[]
  formatValue: (value: number) => string
  formatDate: (iso: string) => string
  height?: number
}) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  if (points.length === 0) return null

  const times = points.map((p) => Date.parse(p.date))
  const values = points.map((p) => p.value)
  const ticks = niceTicks(Math.min(...values), Math.max(...values), 4)
  const x = linear(times[0], times[times.length - 1], PAD.left, width - PAD.right)
  const y = linear(ticks[0], ticks[ticks.length - 1], height - PAD.bottom, PAD.top)
  const xy = points.map((p, i) => [x(times[i]), y(p.value)] as const)
  const line = xy.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('')
  const base = height - PAD.bottom
  const area = `${line}L${xy[xy.length - 1][0].toFixed(1)},${base}L${xy[0][0].toFixed(1)},${base}Z`
  const last = xy[xy.length - 1]
  const dateTicks =
    points.length > 1 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0]

  function nearest(clientX: number, rect: DOMRect) {
    const px = ((clientX - rect.left) / rect.width) * width
    let best = 0
    for (let i = 1; i < xy.length; i++)
      if (Math.abs(xy[i][0] - px) < Math.abs(xy[best][0] - px)) best = i
    return best
  }
  const onPointer = (e: PointerEvent<SVGSVGElement>) =>
    setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End')
      return
    e.preventDefault()
    const current = active ?? points.length - 1
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? points.length - 1
          : current + (e.key === 'ArrowLeft' ? -1 : 1)
    setActive(Math.max(0, Math.min(points.length - 1, next)))
  }
  const activePoint = active === null ? null : points[active]

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
          onPointerMove={onPointer}
          onPointerDown={onPointer}
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
          {dateTicks.map((i) => (
            <text
              key={i}
              className={styles.tick}
              x={xy[i][0]}
              y={height - 8}
              textAnchor={
                i === 0 && points.length > 1
                  ? 'start'
                  : i === points.length - 1 && points.length > 1
                    ? 'end'
                    : 'middle'
              }
            >
              {formatDate(points[i].date)}
            </text>
          ))}
          {points.length > 1 && <path className={styles.area} d={area} />}
          {points.length > 1 && <path className={styles.line} d={line} />}
          <circle className={styles.dot} cx={last[0]} cy={last[1]} r={4} />
          <text className={styles.endLabel} x={last[0] + 8} y={last[1] + 4}>
            {formatValue(points[points.length - 1].value)}
          </text>
          {active !== null && (
            <g>
              <line
                className={styles.crosshair}
                x1={xy[active][0]}
                x2={xy[active][0]}
                y1={PAD.top}
                y2={base}
              />
              <circle className={styles.dot} cx={xy[active][0]} cy={xy[active][1]} r={5} />
            </g>
          )}
        </svg>
        {activePoint && active !== null && (
          <div
            className={styles.tooltip}
            style={{ left: Math.min(Math.max(xy[active][0], 60), width - 60) }}
            role="status"
          >
            <span className={styles.tooltipValue}>{formatValue(activePoint.value)}</span>
            <span className={styles.tooltipLabel}>{formatDate(activePoint.date)}</span>
          </div>
        )}
      </div>
      <details className={styles.table}>
        <summary>Show as table</summary>
        <table>
          <caption className="visually-hidden">{label}</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p, i) => (
              <tr key={`${p.date}-${i}`}>
                <td>{formatDate(p.date)}</td>
                <td>{formatValue(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
