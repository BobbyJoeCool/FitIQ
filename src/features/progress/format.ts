/** "Nov 3" for axes. */
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/** "Mon, Nov 3, 2026" for tooltips and tables. */
export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

/** "+1.5", "−2.0", "0.0": signed, one decimal, with a real minus sign. */
export function signed(value: number, digits = 1): string {
  const fixed = Math.abs(value).toFixed(digits)
  if (Number(fixed) === 0) return Number(0).toFixed(digits)
  return `${value > 0 ? '+' : '−'}${fixed}`
}
