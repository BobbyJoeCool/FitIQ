import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CATALOG_COMMIT,
  CATALOG_URL,
  catalogImageUrl,
  loadCatalog,
  parseCatalog,
  resetCatalogCache,
} from './catalog'

const RAW = [
  {
    id: '3_4_Sit-Up',
    name: '3/4 Sit-Up',
    force: 'pull',
    level: 'beginner',
    mechanic: 'compound',
    equipment: 'body only',
    primaryMuscles: ['abdominals'],
    secondaryMuscles: [],
    instructions: ['Lie down.', 'Sit up.'],
    category: 'strength',
    images: ['3_4_Sit-Up/0.jpg', '3_4_Sit-Up/1.jpg'],
  },
  { id: 'No_Media', name: 'No Media', level: 'expert', equipment: null, images: [] },
  { id: '', name: 'Missing ID' },
  { name: 'No ID at all' },
  null,
]

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response

beforeEach(() => resetCatalogCache())

describe('catalog URLs', () => {
  it('pins the JSON and images to one commit', () => {
    expect(CATALOG_COMMIT).toMatch(/^[0-9a-f]{40}$/)
    expect(CATALOG_URL).toBe(
      `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${CATALOG_COMMIT}/dist/exercises.json`,
    )
    expect(catalogImageUrl('Air_Bike/0.jpg')).toBe(
      `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${CATALOG_COMMIT}/exercises/Air_Bike/0.jpg`,
    )
  })

  it('encodes unusual characters in image paths', () => {
    expect(catalogImageUrl('A B/0.jpg')).toMatch(/\/exercises\/A%20B\/0\.jpg$/)
  })
})

describe('parseCatalog', () => {
  it('maps dataset fields to the app type', () => {
    const [situp] = parseCatalog(RAW)
    expect(situp).toEqual({
      id: '3_4_Sit-Up',
      source: 'catalog',
      name: '3/4 Sit-Up',
      description: null,
      primaryMuscles: ['abdominals'],
      secondaryMuscles: [],
      equipment: 'body only',
      difficulty: 'beginner',
      movementType: 'strength',
      force: 'pull',
      mechanic: 'compound',
      instructions: ['Lie down.', 'Sit up.'],
      images: [catalogImageUrl('3_4_Sit-Up/0.jpg'), catalogImageUrl('3_4_Sit-Up/1.jpg')],
      videoUrl: null,
      videoSourceName: null,
      isArchived: false,
    })
  })

  it('skips entries without an ID or name and tolerates missing fields', () => {
    const parsed = parseCatalog(RAW)
    expect(parsed.map((e) => e.id)).toEqual(['3_4_Sit-Up', 'No_Media'])
    expect(parsed[1]).toMatchObject({ equipment: null, images: [], primaryMuscles: [] })
  })

  it('rejects something that is not a list', () => {
    expect(() => parseCatalog({ exercises: [] })).toThrow(/expected format/)
    expect(() => parseCatalog([])).toThrow(/empty/)
  })
})

describe('loadCatalog', () => {
  it('fetches the pinned URL once and reuses the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(RAW))
    const first = await loadCatalog(fetchMock)
    const second = await loadCatalog(fetchMock)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(CATALOG_URL)
    expect(second).toBe(first)
  })

  it('reports HTTP and network failures and lets a retry fetch again', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(okResponse(RAW))

    await expect(loadCatalog(fetchMock)).rejects.toThrow('HTTP 503')
    await expect(loadCatalog(fetchMock)).rejects.toThrow(/Check your connection/)
    await expect(loadCatalog(fetchMock)).resolves.toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('reports unreadable JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad')
      },
    } as unknown as Response)
    await expect(loadCatalog(fetchMock)).rejects.toThrow(/could not be read/)
  })
})
