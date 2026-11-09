import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../../lib/data'
import { LIBRARY } from '../../test/exerciseFixtures'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../lib/data')

const custom = LIBRARY[3]

beforeEach(() => {
  vi.mocked(data.getCurrentUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.getMyCustomExercise).mockResolvedValue(custom)
})

describe('custom exercise form', () => {
  it('shows validation errors before saving', async () => {
    const user = userEvent.setup()
    renderRoute('/exercises/custom/new')
    await user.click(await screen.findByRole('button', { name: 'Create exercise' }))
    expect(screen.getByText('Give the exercise a name.')).toBeInTheDocument()
    expect(screen.getByText('Pick at least one primary muscle.')).toBeInTheDocument()
    expect(data.createCustomExercise).not.toHaveBeenCalled()
    // The error describes the field without changing its name.
    const name = screen.getByLabelText('Name')
    expect(name).toHaveAccessibleName('Name')
    expect(name).toHaveAccessibleDescription('Give the exercise a name.')
    expect(name).toHaveAttribute('aria-invalid', 'true')
  })

  it('creates an exercise and opens it', async () => {
    vi.mocked(data.createCustomExercise).mockResolvedValue({ ...custom, id: 'new-id' })
    const user = userEvent.setup()
    const { router } = renderRoute('/exercises/custom/new')

    await user.type(await screen.findByLabelText('Name'), 'Goblet Squat')
    const [primaryQuads] = screen.getAllByRole('checkbox', { name: 'Quadriceps' })
    await user.click(primaryQuads)
    await user.selectOptions(screen.getByLabelText('Equipment'), 'kettlebells')
    await user.type(screen.getByLabelText('Video link (optional)'), 'https://youtu.be/abcdefghijk')
    await user.type(screen.getByLabelText('Video source name (optional)'), 'Coach')
    await user.click(screen.getByRole('button', { name: 'Create exercise' }))

    expect(data.createCustomExercise).toHaveBeenCalledWith({
      name: 'Goblet Squat',
      description: null,
      primaryMuscles: ['quadriceps'],
      secondaryMuscles: [],
      equipment: 'kettlebells',
      difficulty: null,
      movementType: null,
      videoUrl: 'https://youtu.be/abcdefghijk',
      videoSourceName: 'Coach',
    })
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/exercises/custom/new-id'))
  })

  it('stops a muscle being both primary and secondary', async () => {
    const user = userEvent.setup()
    renderRoute('/exercises/custom/new')
    const [primaryChest, secondaryChest] = await screen.findAllByRole('checkbox', {
      name: 'Chest',
    })
    await user.click(primaryChest)
    expect(secondaryChest).toBeDisabled()
  })

  it('edits an existing exercise', async () => {
    vi.mocked(data.updateCustomExercise).mockResolvedValue({ ...custom, name: 'Pad Walk' })
    const user = userEvent.setup()
    renderRoute(`/exercises/custom/${custom.id}/edit`)

    const name = await screen.findByLabelText('Name')
    expect(name).toHaveValue(custom.name)
    await user.clear(name)
    await user.type(name, 'Pad Walk')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(data.updateCustomExercise).toHaveBeenCalledWith(
      'user-a',
      custom.id,
      expect.objectContaining({ name: 'Pad Walk', primaryMuscles: ['calves'] }),
    )
  })

  it('shows a save error and lets the user try again', async () => {
    vi.mocked(data.createCustomExercise).mockRejectedValue(new Error('Network down'))
    const user = userEvent.setup()
    renderRoute('/exercises/custom/new')
    await user.type(await screen.findByLabelText('Name'), 'Row')
    await user.click(screen.getAllByRole('checkbox', { name: 'Lats' })[0])
    await user.click(screen.getByRole('button', { name: 'Create exercise' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')
    expect(screen.getByRole('button', { name: 'Create exercise' })).toBeEnabled()
  })
})
