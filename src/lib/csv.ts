/**
 * CSV for the data export (step 8.2): RFC 4180 quoting, CRLF line ends, and a
 * UTF-8 byte-order mark so Excel opens accents and symbols correctly.
 */
export type Cell = string | number | boolean | null | undefined

export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  // Quote anything with a comma, quote, or line break. Prefix cells that a
  // spreadsheet would run as a formula, so exported notes can't execute.
  const safe = /^[=+\-@\t\r]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
