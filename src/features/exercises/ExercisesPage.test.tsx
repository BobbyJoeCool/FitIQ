import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../../lib/data'
import { LIBRARY, makeExercise } from '../../test/exerciseFixtures'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../lib/data')

const results = () => within(screen.getByRole('list')).getAllByRole('link')
const resultNames = () => results().map((link) => link.querySelector('span span')?.textContent)

beforeEach(() => {
  vi.mocked(data.getCurrentUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.loadExerciseLibrary).mockResolvedValue(LIBRARY)
})

describe('ExercisesPage', () => {
  it('shows a loading state, then the library without archived exercises', async () => {
    let finish: (value: typeof LIBRARY) => void = () => {}
    vi.mocked(data.loadExerciseLibrary).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    renderRoute('/exercises')
    expect(await screen.findByText('Loading exercises…')).toBeInTheDocument()
    finish(LIBRARY)
    expect(await screen.findByText('4 of 4 exercises')).toBeInTheDocument()
    expect(resultNames()).toEqual([
      'Barbell Squat',
      'Dumbbell Bench Press',
      'Hamstring Stretch',
      'Walking Pad Incline Walk',
    ])
    expect(data.loadExerciseLibrary).toHaveBeenCalledWith('user-a')
  })

  it('marks custom exercises and exercises with no demo', async () => {
    renderRoute('/exercises')
    const stretch = await screen.findByRole('link', { name: /Hamstring Stretch/ })
    expect(within(stretch).getByText('No demo')).toBeInTheDocument()
    expect(within(stretch).getByText('No images')).toBeInTheDocument()
    const custom = screen.getByRole('link', { name: /Walking Pad/ })
    expect(within(custom).getByText('Custom')).toBeInTheDocument()
    expect(within(custom).queryByText('No demo')).not.toBeInTheDocument()
  })

  it('lazy-loads thumbnails at a fixed size', async () => {
    renderRoute('/exercises')
    const squat = await screen.findByRole('link', { name: /Barbell Squat/ })
    const img = squat.querySelector('img')!
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('width', '64')
  })

  it('combines search and every filter, and keeps them in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/exercises')
    await screen.findByText('4 of 4 exercises')

    await user.selectOptions(screen.getByLabelText('Muscle'), 'hamstrings')
    expect(resultNames()).toEqual(['Barbell Squat', 'Hamstring Stretch'])

    await user.selectOptions(screen.getByLabelText('Movement type'), 'strength')
    expect(resultNames()).toEqual(['Barbell Squat'])

    await user.selectOptions(screen.getByLabelText('Equipment'), 'barbell')
    await user.selectOptions(screen.getByLabelText('Difficulty'), 'beginner')
    await user.type(screen.getByLabelText('Search'), 'squat')
    expect(resultNames()).toEqual(['Barbell Squat'])

    expect(router.state.location.search).toBe(
      '?q=squat&muscle=hamstrings&equipment=barbell&type=strength&difficulty=beginner',
    )
  })

  it('restores filters from the URL', async () => {
    renderRoute('/exercises?equipment=dumbbell')
    expect(await screen.findByText('1 of 4 exercises')).toBeInTheDocument()
    expect(screen.getByLabelText('Equipment')).toHaveValue('dumbbell')
  })

  it('shows an empty state that clears the filters', async () => {
    const user = userEvent.setup()
    renderRoute('/exercises?q=zzz')
    expect(await screen.findByText('No exercises match')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[1])
    expect(await screen.findByText('4 of 4 exercises')).toBeInTheDocument()
  })

  it('can include archived custom exercises', async () => {
    const user = userEvent.setup()
    renderRoute('/exercises')
    await user.click(await screen.findByLabelText('Show archived (1)'))
    const archived = screen.getByRole('link', { name: /Old Band Pull/ })
    expect(within(archived).getByText('Archived')).toBeInTheDocument()
  })

  it('shows an error state with a working retry', async () => {
    vi.mocked(data.loadExerciseLibrary)
      .mockRejectedValueOnce(new Error('Could not download the exercise catalog.'))
      .mockResolvedValueOnce(LIBRARY)
    const user = userEvent.setup()
    renderRoute('/exercises')
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not download')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('4 of 4 exercises')).toBeInTheDocument()
  })

  it('pages long result lists', async () => {
    const many = Array.from({ length: 45 }, (_, i) =>
      makeExercise({ id: `E${i}`, name: `Exercise ${String(i).padStart(2, '0')}` }),
    )
    vi.mocked(data.loadExerciseLibrary).mockResolvedValue(many)
    const user = userEvent.setup()
    renderRoute('/exercises')
    await screen.findByText('45 of 45 exercises')
    expect(results()).toHaveLength(40)
    await user.click(screen.getByRole('button', { name: 'Show more (5 left)' }))
    expect(results()).toHaveLength(45)
  })

  it('links catalog and custom exercises to their detail screens', async () => {
    renderRoute('/exercises')
    expect(await screen.findByRole('link', { name: /Barbell Squat/ })).toHaveAttribute(
      'href',
      '/exercises/Barbell_Squat',
    )
    expect(screen.getByRole('link', { name: /Walking Pad/ })).toHaveAttribute(
      'href',
      '/exercises/custom/7b0c4a6e-0000-4000-8000-000000000001',
    )
  })
})
