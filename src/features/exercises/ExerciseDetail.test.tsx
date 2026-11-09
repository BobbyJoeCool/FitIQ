import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../../lib/data'
import { LIBRARY, makeExercise } from '../../test/exerciseFixtures'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../lib/data')

const custom = LIBRARY[3]

beforeEach(() => {
  vi.mocked(data.getCurrentUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
})

describe('catalog exercise detail', () => {
  it('shows facts, lazy images, numbered steps, and attribution', async () => {
    vi.mocked(data.getCatalogExercise).mockResolvedValue(makeExercise())
    renderRoute('/exercises/Barbell_Squat')

    expect(await screen.findByRole('heading', { name: 'Barbell Squat' })).toBeInTheDocument()
    expect(data.getCatalogExercise).toHaveBeenCalledWith('Barbell_Squat')
    expect(screen.getByText('Glutes, Hamstrings')).toBeInTheDocument()
    expect(screen.getByText('Compound')).toBeInTheDocument()
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
    images.forEach((img) => expect(img).toHaveAttribute('loading', 'lazy'))
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Stand under the bar.',
      'Squat down.',
    ])
    expect(screen.getByRole('link', { name: 'Free Exercise DB' })).toHaveAttribute(
      'href',
      'https://github.com/yuhonas/free-exercise-db',
    )
  })

  it('says so when an exercise has no media', async () => {
    vi.mocked(data.getCatalogExercise).mockResolvedValue(makeExercise({ images: [] }))
    renderRoute('/exercises/Barbell_Squat')
    expect(await screen.findByText('This exercise has no images or video.')).toBeInTheDocument()
    expect(screen.getByText('No demo')).toBeInTheDocument()
  })

  it('handles an unknown ID', async () => {
    vi.mocked(data.getCatalogExercise).mockResolvedValue(null)
    renderRoute('/exercises/Nope')
    expect(await screen.findByText('Exercise not found')).toBeInTheDocument()
  })
})

describe('custom exercise detail', () => {
  it('loads the video only on tap, with a plain link always available', async () => {
    vi.mocked(data.getMyCustomExercise).mockResolvedValue(custom)
    const user = userEvent.setup()
    const { container } = renderRoute(`/exercises/custom/${custom.id}`)

    await screen.findByRole('heading', { name: custom.name })
    expect(data.getMyCustomExercise).toHaveBeenCalledWith('user-a', custom.id)
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByRole('link', { name: 'Open the video on youtu.be' })).toHaveAttribute(
      'href',
      custom.videoUrl,
    )

    await user.click(screen.getByRole('button', { name: 'Play video' }))
    expect(container.querySelector('iframe')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1&rel=0',
    )
    expect(screen.queryByText(/Free Exercise DB/)).not.toBeInTheDocument()
  })

  it('offers only the plain link for sites it cannot embed', async () => {
    vi.mocked(data.getMyCustomExercise).mockResolvedValue({
      ...custom,
      videoUrl: 'https://vimeo.com/123',
      videoSourceName: 'My coach',
    })
    renderRoute(`/exercises/custom/${custom.id}`)
    expect(await screen.findByRole('link', { name: 'Open the video on My coach' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Play video' })).not.toBeInTheDocument()
  })

  it('archives and restores', async () => {
    vi.mocked(data.getMyCustomExercise).mockResolvedValue(custom)
    vi.mocked(data.setCustomExerciseArchived)
      .mockResolvedValueOnce({ ...custom, isArchived: true })
      .mockResolvedValueOnce({ ...custom, isArchived: false })
    const user = userEvent.setup()
    renderRoute(`/exercises/custom/${custom.id}`)

    await user.click(await screen.findByRole('button', { name: 'Archive' }))
    expect(data.setCustomExerciseArchived).toHaveBeenCalledWith('user-a', custom.id, true)
    expect(await screen.findByText('Archived')).toBeInTheDocument()
    expect(screen.getByText(/hidden from search but stay on past workouts/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restore' }))
    expect(data.setCustomExerciseArchived).toHaveBeenLastCalledWith('user-a', custom.id, false)
    expect(await screen.findByRole('button', { name: 'Archive' })).toBeInTheDocument()
  })

  it('handles another user’s or a missing exercise as not found', async () => {
    vi.mocked(data.getMyCustomExercise).mockResolvedValue(null)
    renderRoute('/exercises/custom/someone-elses')
    expect(await screen.findByText('Exercise not found')).toBeInTheDocument()
  })
})
