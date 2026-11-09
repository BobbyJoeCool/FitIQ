/** Round, evenly spaced axis ticks covering [min, max] (about `count` of them). */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0]
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1
    min -= pad
    max += pad
  }
  const rough = (max - min) / Math.max(1, count)
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let t = start; t <= end + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6)
  return ticks
}

/** Maps a value in [d0, d1] to [r0, r1]. */
export const linear = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)

/** Compact tick text: 1,250 under 10,000; 12K above. */
export function tickLabel(value: number): string {
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 1000)}K`
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}
