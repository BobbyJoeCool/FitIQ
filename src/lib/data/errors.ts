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
  return new DataError(error.message || fallback, error.code)
}
