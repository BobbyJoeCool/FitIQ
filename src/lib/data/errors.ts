/** A data-layer failure with a message that is safe to show the user. */
export class DataError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'DataError'
    this.code = code
  }
}

export function toDataError(
  error: { message: string; code?: string },
  fallback: string,
): DataError {
  // A network failure surfaces as "TypeError: Failed to fetch" (or similar).
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(error.message)) {
    return new DataError(
      "Can't reach FitIQ's server. Check your connection and try again.",
      'network',
    )
  }
  return new DataError(error.message || fallback, error.code)
}
