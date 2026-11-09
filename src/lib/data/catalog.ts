import type { Exercise } from './exerciseTypes'
import { DataError } from './errors'

/**
 * The shared exercise catalog: Free Exercise DB, read at runtime from one
 * pinned commit on jsDelivr (plan.md section 7, docs/exercise-sources.md).
 * Bumping the commit is a deliberate change: see docs/exercise-sources.md.
 */
export const CATALOG_COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5'

const CDN_BASE = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${CATALOG_COMMIT}`

export const CATALOG_URL = `${CDN_BASE}/dist/exercises.json`

export const CATALOG_SOURCE = {
  name: 'Free Exercise DB',
  url: 'https://github.com/yuhonas/free-exercise-db',
  license: 'The Unlicense (public domain)',
} as const

/** URL for an image path from the dataset JSON, e.g. "Air_Bike/0.jpg". */
export function catalogImageUrl(path: string): string {
  return `${CDN_BASE}/exercises/${path.split('/').map(encodeURIComponent).join('/')}`
}

const isString = (value: unknown): value is string => typeof value === 'string'
const stringOrNull = (value: unknown) => (isString(value) && value.trim() ? value : null)
const stringList = (value: unknown) => (Array.isArray(value) ? value.filter(isString) : [])

/** Validates and maps the dataset JSON. Entries without an ID or name are skipped. */
export function parseCatalog(json: unknown): Exercise[] {
  if (!Array.isArray(json)) {
    throw new DataError('The exercise catalog is not in the expected format.')
  }
  const exercises: Exercise[] = []
  for (const raw of json as Record<string, unknown>[]) {
    if (!raw || !isString(raw.id) || !isString(raw.name) || !raw.id || !raw.name.trim()) continue
    exercises.push({
      id: raw.id,
      source: 'catalog',
      name: raw.name.trim(),
      description: null,
      primaryMuscles: stringList(raw.primaryMuscles),
      secondaryMuscles: stringList(raw.secondaryMuscles),
      equipment: stringOrNull(raw.equipment),
      difficulty: stringOrNull(raw.level),
      movementType: stringOrNull(raw.category),
      force: stringOrNull(raw.force),
      mechanic: stringOrNull(raw.mechanic),
      instructions: stringList(raw.instructions),
      images: stringList(raw.images).map(catalogImageUrl),
      videoUrl: null,
      videoSourceName: null,
      isArchived: false,
    })
  }
  if (exercises.length === 0) throw new DataError('The exercise catalog is empty.')
  return exercises
}

let cached: Promise<Exercise[]> | null = null

/**
 * Loads the catalog once per page load. Across visits the browser serves it
 * from its HTTP cache: jsDelivr marks commit-pinned files `immutable` for a
 * year, so a repeat visit makes no network request. A failed load is not
 * cached, so retrying works.
 */
export function loadCatalog(fetchImpl: typeof fetch = fetch): Promise<Exercise[]> {
  if (!cached) {
    cached = (async () => {
      let response: Response
      try {
        response = await fetchImpl(CATALOG_URL)
      } catch {
        throw new DataError('Could not download the exercise catalog. Check your connection.')
      }
      if (!response.ok) {
        throw new DataError(`Could not download the exercise catalog (HTTP ${response.status}).`)
      }
      let json: unknown
      try {
        json = await response.json()
      } catch {
        throw new DataError('The exercise catalog could not be read.')
      }
      return parseCatalog(json)
    })()
    cached.catch(() => {
      cached = null
    })
  }
  return cached
}

/** Test helper: forget the in-memory catalog. */
export function resetCatalogCache(): void {
  cached = null
}
