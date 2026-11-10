import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../../lib/data'
import type { WeighIn } from '../../lib/data'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../lib/data')

const weighIn = (
  id: string,
  recordedAt: string,
  value: number,
  unit: 'lb' | 'kg' = 'lb',
): WeighIn => ({
  id,
  recordedAt,
  value,
  unit,
  notes: null,
})

beforeEach(() => {
  vi.mocked(data.getCurrentUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.getMyProfile).mockResolvedValue({
    id: 'user-a',
    displayName: 'Alex',
    weightUnit: 'lb',
    lengthUnit: 'in',
  })
  vi.mocked(data.getWeighInSeries).mockResolvedValue([])
  vi.mocked(data.listWeighIns).mockResolvedValue({ items: [], hasMore: false })
  vi.mocked(data.listMeasurements).mockResolvedValue([])
  vi.mocked(data.listFinishedWorkoutDates).mockResolvedValue([])
  vi.mocked(data.getLatestWeighIn).mockResolvedValue(null)
  vi.mocked(data.getInProgressSession).mockResolvedValue(null)
  vi.mocked(data.listSessions).mockResolvedValue({ items: [], hasMore: false })
  vi.mocked(data.listCardio).mockResolvedValue({ items: [], hasMore: false })
  vi.mocked(data.listCardioSince).mockResolvedValue([])
  vi.mocked(data.listMyPlans).mockResolvedValue([])
})

describe('weigh-ins (6.1) and the weight chart (6.2)', () => {
  it('validates, then saves a weigh-in with its unit and time', async () => {
    vi.mocked(data.createWeighIn).mockImplementation(async (input) => ({ id: 'w1', ...input }))
    const user = userEvent.setup()
    renderRoute('/progress/weight')
    const form = await screen.findByRole('form', { name: 'Log a weigh-in' })
    await user.click(within(form).getByRole('button', { name: 'Save weigh-in' }))
    expect(within(form).getByLabelText('Weight')).toHaveAccessibleDescription('Enter your weight.')
    await user.type(within(form).getByLabelText('Weight'), '5')
    await user.click(within(form).getByRole('button', { name: 'Save weigh-in' }))
    expect(within(form).getByLabelText('Weight')).toHaveAccessibleDescription(
      'Use a weight between 20 and 1000 lb.',
    )

    await user.clear(within(form).getByLabelText('Weight'))
    await user.type(within(form).getByLabelText('Weight'), '82.5')
    await user.selectOptions(within(form).getByLabelText('Unit'), 'kg')
    await user.click(within(form).getByRole('button', { name: 'Save weigh-in' }))
    expect(data.createWeighIn).toHaveBeenCalledWith(
      expect.objectContaining({ value: 82.5, unit: 'kg', notes: null }),
    )
    // The list and chart reload after saving.
    await vi.waitFor(() => expect(data.listWeighIns).toHaveBeenCalledTimes(2))
  })

  it('charts in the preferred unit, switches ranges, and words change neutrally', async () => {
    vi.mocked(data.getWeighInSeries).mockResolvedValue([
      weighIn('a', '2026-10-01T08:00:00Z', 182),
      weighIn('b', '2026-10-20T08:00:00Z', 81.65, 'kg'),
      weighIn('c', '2026-11-08T08:00:00Z', 179.5),
    ])
    const user = userEvent.setup()
    renderRoute('/progress/weight')
    expect(await screen.findByRole('group', { name: /Weight in lb chart/ })).toBeInTheDocument()
    expect(
      screen.getByText(/−2\.5 lb between the first and last weigh-in in this range \(38 days\)/),
    ).toBeInTheDocument()
    expect(screen.getByText(/can't tell fat from muscle or water/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '90 days' })).toHaveAttribute('aria-pressed', 'true')
    expect(data.getWeighInSeries).toHaveBeenLastCalledWith('user-a', expect.any(String))

    await user.click(screen.getByRole('button', { name: 'All time' }))
    expect(data.getWeighInSeries).toHaveBeenLastCalledWith('user-a', null)

    // The table view converts the kg entry to lb.
    expect(screen.getAllByRole('cell').map((c) => c.textContent)).toContain('180 lb')
  })

  it('reads chart values with the arrow keys', async () => {
    vi.mocked(data.getWeighInSeries).mockResolvedValue([
      weighIn('a', '2026-10-01T08:00:00Z', 182),
      weighIn('c', '2026-11-08T08:00:00Z', 179.5),
    ])
    renderRoute('/progress/weight')
    const chart = await screen.findByRole('group', { name: /Weight in lb chart/ })
    chart.focus()
    fireEvent.keyDown(chart, { key: 'ArrowLeft' })
    expect(within(chart).getByRole('status')).toHaveTextContent('182 lb')
    fireEvent.keyDown(chart, { key: 'End' })
    expect(within(chart).getByRole('status')).toHaveTextContent('179.5 lb')
  })

  it('pages, edits, and deletes weigh-ins', async () => {
    vi.mocked(data.listWeighIns)
      .mockResolvedValueOnce({ items: [weighIn('a', '2026-11-08T08:00:00Z', 180)], hasMore: true })
      .mockResolvedValue({ items: [weighIn('b', '2026-11-01T08:00:00Z', 181)], hasMore: false })
    vi.mocked(data.updateWeighIn).mockImplementation(async (_u, id, input) => ({ id, ...input }))
    vi.mocked(data.deleteWeighIn).mockResolvedValue()
    const user = userEvent.setup()
    renderRoute('/progress/weight')
    await screen.findByText('180 lb')
    await user.click(screen.getByRole('button', { name: 'Older' }))
    expect(await screen.findByText('181 lb')).toBeInTheDocument()
    expect(data.listWeighIns).toHaveBeenLastCalledWith('user-a', 1)

    await user.click(screen.getByRole('button', { name: /Edit weigh-in from/ }))
    const editor = screen.getByRole('form', { name: 'Edit weigh-in' })
    await user.clear(within(editor).getByLabelText('Weight'))
    await user.type(within(editor).getByLabelText('Weight'), '180.5')
    await user.click(within(editor).getByRole('button', { name: 'Save changes' }))
    expect(data.updateWeighIn).toHaveBeenCalledWith(
      'user-a',
      'b',
      expect.objectContaining({ value: 180.5 }),
    )

    await user.click(await screen.findByRole('button', { name: /Delete weigh-in from/ }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(data.deleteWeighIn).toHaveBeenCalledWith('user-a', 'b')
  })
})

describe('measurements (6.3)', () => {
  it('has an empty state, saves a measurement, and charts its type', async () => {
    vi.mocked(data.createMeasurement).mockImplementation(async (input) => ({ id: 'm1', ...input }))
    const user = userEvent.setup()
    renderRoute('/progress/measurements')
    expect(await screen.findByText('No measurements yet')).toBeInTheDocument()

    const form = screen.getByRole('form', { name: 'Log a measurement' })
    await user.selectOptions(within(form).getByLabelText('Measurement'), 'body_fat')
    expect(within(form).getByLabelText('Value (%)')).toBeInTheDocument()
    expect(within(form).queryByLabelText('Unit')).not.toBeInTheDocument()
    await user.type(within(form).getByLabelText('Value (%)'), '22.5')
    await user.click(within(form).getByRole('button', { name: 'Save measurement' }))

    expect(data.createMeasurement).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'body_fat', value: 22.5, unit: '%' }),
    )
    expect(await screen.findByRole('heading', { name: 'Body fat' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Body fat in % chart/ })).toBeInTheDocument()
    expect(screen.getByText(/No entries yet for: waist/)).toBeInTheDocument()
  })

  it('shows lengths in the preferred unit', async () => {
    vi.mocked(data.getMyProfile).mockResolvedValue({
      id: 'user-a',
      displayName: null,
      weightUnit: 'kg',
      lengthUnit: 'cm',
    })
    vi.mocked(data.listMeasurements).mockResolvedValue([
      {
        id: 'm',
        recordedAt: '2026-11-01T08:00:00Z',
        type: 'waist',
        value: 34,
        unit: 'in',
        notes: null,
      },
    ])
    renderRoute('/progress/measurements')
    const card = (await screen.findByRole('heading', { name: 'Waist' })).closest(
      'div',
    )!.parentElement!
    expect(within(card).getByText('in cm')).toBeInTheDocument()
    // Stored value keeps its own unit; the chart converts.
    expect(within(card).getByText('34 in')).toBeInTheDocument()
    expect(within(card).getAllByText('86.4 cm').length).toBeGreaterThan(0)
  })
})

describe('overview and exercises (6.4)', () => {
  it('shows totals and a weekly chart, or an empty state', async () => {
    renderRoute('/progress')
    expect(await screen.findByText('No finished workouts yet')).toBeInTheDocument()
  })

  it('counts recent workouts', async () => {
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString()
    vi.mocked(data.listFinishedWorkoutDates).mockResolvedValue([
      { id: '1', planId: null, startedAt: recent, completedAt: recent },
      {
        id: '2',
        planId: null,
        startedAt: '2025-01-01T10:00:00Z',
        completedAt: '2025-01-01T11:00:00Z',
      },
    ])
    renderRoute('/progress')
    const total = await screen.findByText('Workouts')
    expect(total.nextSibling).toHaveTextContent('2')
    expect(screen.getByRole('group', { name: /Workouts per week/ })).toBeInTheDocument()
  })

  it('shows exact records only for what was logged', async () => {
    vi.mocked(data.getExerciseHistory).mockResolvedValue([
      {
        sessionId: 's1',
        exerciseName: 'Barbell Squat',
        sessionName: 'Leg Day',
        startedAt: '2026-11-01T10:00:00Z',
        sets: [
          {
            id: 'x',
            sessionExerciseId: 'e',
            setNumber: 1,
            reps: 5,
            weightValue: 135,
            weightUnit: 'lb',
            durationSeconds: null,
            distanceValue: null,
            distanceUnit: null,
            notes: null,
            completedAt: '',
          },
        ],
      },
    ])
    renderRoute('/progress/exercises/catalog/Barbell_Squat')
    expect(await screen.findByRole('heading', { name: 'Barbell Squat' })).toBeInTheDocument()
    expect(screen.getByText('Heaviest')).toBeInTheDocument()
    expect(screen.getByText('135 lb × 5')).toBeInTheDocument()
    expect(screen.queryByText('Longest time')).not.toBeInTheDocument()
    expect(screen.queryByText('Longest distance')).not.toBeInTheDocument()
    expect(data.getExerciseHistory).toHaveBeenCalledWith(
      'user-a',
      { source: 'catalog', id: 'Barbell_Squat' },
      200,
    )
  })
})

describe('dashboard (6.5)', () => {
  it('offers to resume a workout in progress', async () => {
    vi.mocked(data.getInProgressSession).mockResolvedValue({
      id: 'w',
      name: 'Leg Day',
      planId: null,
      startedAt: '2026-11-09T10:00:00Z',
      completedAt: null,
      notes: null,
      exercises: [],
    })
    renderRoute('/')
    expect(await screen.findByRole('heading', { name: 'Workout in progress' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Resume workout' })).toHaveAttribute('href', '/workout')
  })

  it('puts the most recently used plan up next and starts it', async () => {
    const plan = (id: string, name: string) => ({
      id,
      name,
      description: null,
      isArchived: false,
      exerciseCount: 3,
      updatedAt: '',
    })
    vi.mocked(data.listMyPlans).mockResolvedValue([plan('a', 'Push'), plan('b', 'Pull')])
    vi.mocked(data.listFinishedWorkoutDates).mockResolvedValue([
      {
        id: 's',
        planId: 'b',
        startedAt: '2026-11-08T10:00:00Z',
        completedAt: '2026-11-08T11:00:00Z',
      },
    ])
    vi.mocked(data.getMyPlan).mockResolvedValue({ ...plan('b', 'Pull'), exercises: [] })
    vi.mocked(data.loadCatalog).mockResolvedValue([])
    vi.mocked(data.startWorkout).mockResolvedValue('new')
    vi.mocked(data.getLatestWeighIn).mockResolvedValue(
      weighIn('w', '2026-11-08T08:00:00Z', 80, 'kg'),
    )
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    expect(await screen.findByRole('heading', { name: 'Up next' })).toBeInTheDocument()
    expect(screen.getByText('176.4 lb')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start Pull' }))
    expect(data.startWorkout).toHaveBeenCalledWith(
      expect.objectContaining({ planId: 'b', name: 'Pull' }),
    )
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/workout'))
  })
})
