import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../../lib/data'
import { LIBRARY } from '../../test/exerciseFixtures'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../lib/data')

/**
 * Back and history across library -> detail -> form (issue #53). Save and
 * Cancel must not leave extra history entries, so Back always returns to the
 * library with its filters.
 */

const custom = LIBRARY[3]
const where = (router: ReturnType<typeof renderRoute>['router']) =>
  router.state.location.pathname + router.state.location.search

beforeEach(() => {
  vi.mocked(data.getCurrentUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.loadExerciseLibrary).mockResolvedValue(LIBRARY)
  vi.mocked(data.getMyCustomExercise).mockResolvedValue(custom)
})

async function openCustomFromLibrary() {
  const user = userEvent.setup()
  const rendered = renderRoute('/exercises?q=walk')
  await user.click(await screen.findByRole('link', { name: /Walking Pad Incline Walk/ }))
  await screen.findByRole('heading', { name: custom.name })
  return { user, ...rendered }
}

describe('exercise history (#53)', () => {
  it('Edit then Cancel, then browser Back, returns to the library', async () => {
    const { user, router } = await openCustomFromLibrary()
    await user.click(screen.getByRole('link', { name: 'Edit' }))
    await user.click(await screen.findByRole('link', { name: 'Cancel' }))
    await screen.findByRole('heading', { name: custom.name })
    expect(router.state.location.pathname).toBe(`/exercises/custom/${custom.id}`)

    await router.navigate(-1)
    expect(where(router)).toBe('/exercises?q=walk')
  })

  it('Edit then Cancel, then "← Exercises", returns to the library with its filters', async () => {
    const { user, router } = await openCustomFromLibrary()
    await user.click(screen.getByRole('link', { name: 'Edit' }))
    await user.click(await screen.findByRole('link', { name: 'Cancel' }))
    await user.click(await screen.findByRole('link', { name: '← Exercises' }))
    await vi.waitFor(() => expect(where(router)).toBe('/exercises?q=walk'))
  })

  it('Edit then Save, then one Back, returns to the library and shows the saved changes', async () => {
    vi.mocked(data.updateCustomExercise).mockResolvedValue({ ...custom, name: 'Pad Walk' })
    const { user, router } = await openCustomFromLibrary()
    await user.click(screen.getByRole('link', { name: 'Edit' }))
    await screen.findByLabelText('Name')
    vi.mocked(data.getMyCustomExercise).mockResolvedValue({ ...custom, name: 'Pad Walk' })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('heading', { name: 'Pad Walk' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/exercises/custom/${custom.id}`)
    await router.navigate(-1)
    expect(where(router)).toBe('/exercises?q=walk')
  })

  it('New exercise then Create, then Back, returns to the library', async () => {
    vi.mocked(data.createCustomExercise).mockResolvedValue({ ...custom, id: 'new-id' })
    const user = userEvent.setup()
    const { router } = renderRoute('/exercises?q=walk')
    await user.click(await screen.findByRole('link', { name: 'New exercise' }))
    await user.type(await screen.findByLabelText('Name'), 'Goblet Squat')
    await user.click(screen.getAllByRole('checkbox', { name: 'Quadriceps' })[0])
    await user.click(screen.getByRole('button', { name: 'Create exercise' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/exercises/custom/new-id'))

    await user.click(await screen.findByRole('link', { name: '← Exercises' }))
    await vi.waitFor(() => expect(where(router)).toBe('/exercises?q=walk'))
  })

  it('New exercise then Cancel, then Back, does not return to the form', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/exercises')
    await user.click(await screen.findByRole('link', { name: 'New exercise' }))
    await user.click(await screen.findByRole('link', { name: 'Cancel' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/exercises'))
    // Cancel went back rather than pushing the library again.
    expect(router.state.historyAction).toBe('POP')
  })

  it('"← Exercises" on a directly opened detail page links to the library', async () => {
    renderRoute(`/exercises/custom/${custom.id}`)
    expect(await screen.findByRole('link', { name: '← Exercises' })).toHaveAttribute(
      'href',
      '/exercises',
    )
  })
})
