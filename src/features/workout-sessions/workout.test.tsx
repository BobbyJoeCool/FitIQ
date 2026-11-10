import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../../lib/data'
import type { SessionExercise, SessionSet, WorkoutSession } from '../../lib/data'
import { NO_TARGETS } from '../../lib/data/plans'
import { LIBRARY, makeExercise } from '../../test/exerciseFixtures'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../lib/data')

const SESSION_ID = 'bbbbbbbb-0000-4000-8000-000000000001'

const set = (overrides: Partial<SessionSet>): SessionSet => ({
  id: `set-${overrides.setNumber ?? 1}`,
  sessionExerciseId: 'x1',
  setNumber: 1,
  reps: null,
  weightValue: null,
  weightUnit: null,
  durationSeconds: null,
  distanceValue: null,
  distanceUnit: null,
  notes: null,
  completedAt: '2026-11-09T10:05:00Z',
  ...overrides,
})

const item = (id: string, overrides: Partial<SessionExercise> = {}): SessionExercise => ({
  id,
  sessionId: SESSION_ID,
  exercise: { source: 'catalog', id: 'Barbell_Squat' },
  exerciseName: 'Barbell Squat',
  sortOrder: 0,
  isSkipped: false,
  targets: { ...NO_TARGETS, targetSets: 3, targetReps: '8-12', restSeconds: 90 },
  sets: [],
  ...overrides,
})

const SESSION: WorkoutSession = {
  id: SESSION_ID,
  name: 'Leg Day',
  planId: 'plan-1',
  startedAt: '2026-11-09T10:00:00Z',
  completedAt: null,
  notes: null,
  exercises: [
    item('x1'),
    item('x2', {
      exercise: { source: 'catalog', id: 'Hamstring_Stretch' },
      exerciseName: 'Hamstring Stretch',
      sortOrder: 1,
      targets: { ...NO_TARGETS, targetSets: 1, targetSeconds: 30, perSide: true, restSeconds: 0 },
    }),
  ],
}

beforeEach(() => {
  vi.mocked(data.getCurrentUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.getMyProfile).mockResolvedValue({
    id: 'user-a',
    displayName: null,
    weightUnit: 'lb',
    lengthUnit: 'in',
  })
  vi.mocked(data.loadExerciseLibrary).mockResolvedValue([
    ...LIBRARY,
    makeExercise({
      id: 'Hamstring_Stretch',
      name: 'Hamstring Stretch',
      movementType: 'stretching',
    }),
  ])
  vi.mocked(data.getInProgressSession).mockResolvedValue(structuredClone(SESSION))
  vi.mocked(data.getExerciseHistory).mockResolvedValue([])
  vi.mocked(data.listMyPlans).mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('starting a workout', () => {
  it('starts from a plan, copying catalog names', async () => {
    vi.mocked(data.getInProgressSession)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(structuredClone(SESSION))
    vi.mocked(data.listMyPlans).mockResolvedValue([
      {
        id: 'plan-1',
        name: 'Leg Day',
        description: null,
        isArchived: false,
        exerciseCount: 2,
        updatedAt: '',
      },
    ])
    vi.mocked(data.getMyPlan).mockResolvedValue({
      id: 'plan-1',
      name: 'Leg Day',
      description: null,
      isArchived: false,
      exerciseCount: 1,
      updatedAt: '',
      exercises: [
        {
          id: 'pe1',
          planId: 'plan-1',
          exercise: { source: 'catalog', id: 'Barbell_Squat' },
          sortOrder: 0,
          ...NO_TARGETS,
        },
      ],
    })
    vi.mocked(data.loadCatalog).mockResolvedValue(LIBRARY.slice(0, 3))
    vi.mocked(data.startWorkout).mockResolvedValue(SESSION_ID)
    const user = userEvent.setup()
    renderRoute('/workout')

    await user.click(await screen.findByRole('button', { name: 'Start Leg Day' }))
    expect(data.startWorkout).toHaveBeenCalledWith({
      name: 'Leg Day',
      planId: 'plan-1',
      catalogNames: { Barbell_Squat: 'Barbell Squat' },
    })
    expect(await screen.findByRole('heading', { name: 'Barbell Squat' })).toBeInTheDocument()
  })

  it('offers plans or an empty workout when there are no plans', async () => {
    vi.mocked(data.getInProgressSession).mockResolvedValue(null)
    vi.mocked(data.startWorkout).mockRejectedValue(
      new Error('You already have a workout in progress. Finish or discard it first.'),
    )
    const user = userEvent.setup()
    renderRoute('/workout')
    expect(await screen.findByText('No plans yet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start an empty workout' }))
    expect(data.startWorkout).toHaveBeenCalledWith({
      name: 'Workout',
      planId: null,
      catalogNames: {},
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('already have a workout in progress')
  })
})

describe('logging sets', () => {
  it('shows the target and last time, saves a set, then prefills the next', async () => {
    vi.mocked(data.getExerciseHistory).mockResolvedValue([
      {
        sessionId: 'old',
        exerciseName: 'Barbell Squat',
        sessionName: 'Leg Day',
        startedAt: '2026-11-02T10:00:00Z',
        sets: [set({ reps: 8, weightValue: 135, weightUnit: 'lb' })],
      },
    ])
    vi.mocked(data.saveSet).mockImplementation(async (exerciseId, setNumber, input) =>
      set({ ...input, sessionExerciseId: exerciseId, setNumber, id: `new-${setNumber}` }),
    )
    const user = userEvent.setup()
    renderRoute('/workout')

    expect(await screen.findByRole('heading', { name: 'Barbell Squat' })).toBeInTheDocument()
    expect(screen.getByText('Target: 3 × 8-12 · Rest 1:30')).toBeInTheDocument()
    expect(await screen.findByText(/Last time .*: 8 × 135 lb/)).toBeInTheDocument()

    const form = screen.getByRole('form', { name: 'Set 1 of 3' })
    expect(within(form).getByLabelText('Reps')).toHaveValue('8')
    expect(within(form).getByLabelText('Weight (lb)')).toHaveValue('135')
    await user.click(within(form).getByRole('button', { name: 'More weight (lb)' }))
    await user.click(within(form).getByRole('button', { name: 'Complete set' }))

    expect(data.saveSet).toHaveBeenCalledWith('x1', 1, {
      reps: 8,
      weightValue: 140,
      weightUnit: 'lb',
      durationSeconds: null,
      distanceValue: null,
      distanceUnit: 'mi',
      notes: null,
    })
    const done = await screen.findByRole('list', { name: 'Sets done' })
    expect(done).toHaveTextContent('Set 1')
    expect(done).toHaveTextContent('8 × 140 lb')
    expect(screen.getByRole('form', { name: 'Set 2 of 3' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('form', { name: 'Set 2 of 3' })).getByLabelText('Weight (lb)'),
    ).toHaveValue('140')
    // The plan's 90 s rest starts, in place of Complete set, until it's skipped.
    const next = screen.getByRole('form', { name: 'Set 2 of 3' })
    expect(within(next).getByRole('timer', { name: 'Rest timer' })).toHaveTextContent('Rest 1:30')
    expect(within(next).queryByRole('button', { name: 'Complete set' })).not.toBeInTheDocument()
    await user.click(within(next).getByRole('button', { name: 'Skip rest' }))
    expect(within(next).queryByRole('timer', { name: 'Rest timer' })).not.toBeInTheDocument()
    expect(within(next).getByRole('button', { name: 'Complete set' })).toBeEnabled()
  })

  it('keeps what was typed when a save fails', async () => {
    vi.mocked(data.saveSet).mockRejectedValueOnce(new Error('Network down.'))
    const user = userEvent.setup()
    renderRoute('/workout')
    const form = await screen.findByRole('form', { name: 'Set 1 of 3' })
    await user.clear(within(form).getByLabelText('Reps'))
    await user.type(within(form).getByLabelText('Reps'), '10')
    await user.click(within(form).getByRole('button', { name: 'Complete set' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Network down. Your entry is kept: try again.',
    )
    expect(within(form).getByLabelText('Reps')).toHaveValue('10')
    expect(within(form).getByRole('button', { name: 'Complete set' })).toBeEnabled()
  })

  it('blocks saving while offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderRoute('/workout')
    const form = await screen.findByRole('form', { name: 'Set 1 of 3' })
    expect(within(form).getByRole('button', { name: 'Complete set' })).toBeDisabled()
    expect(
      within(form).getByText("You're offline. Reconnect to save this set."),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/You're offline/).length).toBeGreaterThan(1)
    vi.restoreAllMocks()
  })

  it('skips an exercise and moves to the next one', async () => {
    vi.mocked(data.setSessionExerciseSkipped).mockResolvedValue()
    const user = userEvent.setup()
    renderRoute('/workout')
    await user.click(await screen.findByRole('button', { name: 'Skip' }))
    expect(data.setSessionExerciseSkipped).toHaveBeenCalledWith('user-a', 'x1', true)
    expect(await screen.findByRole('heading', { name: 'Hamstring Stretch' })).toBeInTheDocument()
    const strip = screen.getByRole('list', { name: 'Exercises in this workout' })
    expect(within(strip).getAllByRole('button')[0]).toHaveTextContent('Skipped')
  })

  it('runs a hold timer for a timed stretch, switching sides', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderRoute(`/workout?exercise=x2`)
    const form = await screen.findByRole('form', { name: 'Set 1 of 1' })
    expect(within(form).getByLabelText('Seconds (each side)')).toHaveValue('30')
    expect(within(form).getByRole('timer')).toHaveAccessibleName('30 s each side')

    await user.click(within(form).getByRole('button', { name: 'Start timer' }))
    expect(within(form).getByRole('timer')).toHaveAccessibleName('First side')
    await act(async () => {
      vi.advanceTimersByTime(30_500)
    })
    expect(within(form).getByRole('timer')).toHaveAccessibleName('Switch sides')
    await act(async () => {
      vi.advanceTimersByTime(5_500)
    })
    expect(within(form).getByRole('timer')).toHaveAccessibleName('Second side')
    await act(async () => {
      vi.advanceTimersByTime(30_500)
    })
    expect(within(form).getByRole('timer')).toHaveAccessibleName('Done')
  })

  it('follows the Seconds field and the Each side toggle', async () => {
    const user = userEvent.setup()
    renderRoute(`/workout?exercise=x2`)
    const form = await screen.findByRole('form', { name: 'Set 1 of 1' })
    const seconds = within(form).getByLabelText('Seconds (each side)')
    await user.clear(seconds)
    await user.type(seconds, '45')
    expect(within(form).getByRole('timer')).toHaveAccessibleName('45 s each side')

    await user.click(within(form).getByRole('checkbox', { name: 'Each side (left and right)' }))
    expect(within(form).getByLabelText('Seconds')).toHaveValue('45')
    expect(within(form).getByRole('timer')).toHaveAccessibleName('45 s hold')

    await user.clear(within(form).getByLabelText('Seconds'))
    expect(within(form).getByRole('button', { name: 'Start timer' })).toBeDisabled()
  })

  it('runs repeated holds with a release, and logs the holds as reps', async () => {
    vi.mocked(data.getInProgressSession).mockResolvedValue({
      ...structuredClone(SESSION),
      exercises: [
        item('x1', {
          exercise: { source: 'catalog', id: 'Hamstring_Stretch' },
          exerciseName: 'Ab Roller',
          targets: {
            ...NO_TARGETS,
            targetSets: 1,
            targetReps: '2',
            targetSeconds: 10,
            targetReleaseSeconds: 5,
          },
        }),
      ],
    })
    vi.mocked(data.saveSet).mockImplementation(async (exerciseId, setNumber, input) =>
      set({ ...input, sessionExerciseId: exerciseId, setNumber }),
    )
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderRoute('/workout')
    const form = await screen.findByRole('form', { name: 'Set 1 of 1' })
    expect(within(form).getByLabelText('Reps (holds)')).toHaveValue('2')
    expect(within(form).getByRole('timer')).toHaveAccessibleName('2 × 10 s hold, 5 s release')

    await user.click(within(form).getByRole('button', { name: 'Start timer' }))
    expect(within(form).getByRole('timer')).toHaveAccessibleName('Hold · 1 of 2')
    await act(async () => {
      vi.advanceTimersByTime(10_500)
    })
    expect(within(form).getByRole('timer')).toHaveAccessibleName('Release')
    await act(async () => {
      vi.advanceTimersByTime(5_500)
    })
    expect(within(form).getByRole('timer')).toHaveAccessibleName('Hold · 2 of 2')
    await act(async () => {
      vi.advanceTimersByTime(10_500)
    })
    expect(within(form).getByRole('timer')).toHaveAccessibleName('Done')

    await user.click(within(form).getByRole('button', { name: 'Complete set' }))
    expect(data.saveSet).toHaveBeenCalledWith(
      'x1',
      1,
      expect.objectContaining({ reps: 2, durationSeconds: 10, weightValue: null }),
    )
  })
})

describe('finishing', () => {
  it('reviews totals and finishes, opening the workout in history', async () => {
    vi.mocked(data.getInProgressSession).mockResolvedValue({
      ...structuredClone(SESSION),
      exercises: [
        item('x1', {
          sets: [
            set({ reps: 10, weightValue: 100, weightUnit: 'lb' }),
            set({ setNumber: 2, reps: 8, weightValue: 100, weightUnit: 'lb' }),
          ],
        }),
        item('x2', { exerciseName: 'Hamstring Stretch', sortOrder: 1 }),
      ],
    })
    vi.mocked(data.finishSession).mockResolvedValue()
    vi.mocked(data.getSession).mockResolvedValue({
      ...SESSION,
      completedAt: '2026-11-09T11:00:00Z',
    })
    const user = userEvent.setup()
    const { router } = renderRoute('/workout')

    await user.click(await screen.findByRole('button', { name: 'Finish workout' }))
    expect(screen.getByRole('heading', { name: 'Finish Leg Day?' })).toBeInTheDocument()
    expect(screen.getByText('1800 lb')).toBeInTheDocument()
    expect(screen.getByText(/No sets logged for Hamstring Stretch/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Notes (optional)'), 'Felt strong')
    await user.click(screen.getByRole('button', { name: 'Finish workout' }))

    expect(data.finishSession).toHaveBeenCalledWith('user-a', SESSION_ID, 'Felt strong')
    await vi.waitFor(() =>
      expect(router.state.location.pathname).toBe(`/workout/history/${SESSION_ID}`),
    )
  })

  it('discards a workout after confirming', async () => {
    vi.mocked(data.deleteSession).mockResolvedValue()
    const user = userEvent.setup()
    renderRoute('/workout')
    await user.click(await screen.findByRole('button', { name: 'Finish workout' }))
    await user.click(screen.getByRole('button', { name: 'Discard workout' }))
    vi.mocked(data.getInProgressSession).mockResolvedValue(null)
    await user.click(
      within(screen.getByRole('group', { name: 'Discard this workout?' })).getByRole('button', {
        name: 'Discard',
      }),
    )
    expect(data.deleteSession).toHaveBeenCalledWith('user-a', SESSION_ID)
    expect(await screen.findByRole('heading', { name: 'Workout' })).toBeInTheDocument()
  })
})

describe('history', () => {
  const summary = (n: number) => ({
    id: `s${n}`,
    name: `Workout ${n}`,
    startedAt: '2026-11-08T10:00:00Z',
    completedAt: '2026-11-08T10:45:00Z',
    exerciseCount: 3,
  })

  it('lists finished workouts a page at a time', async () => {
    vi.mocked(data.listSessions)
      .mockResolvedValueOnce({ items: [summary(1), summary(2)], hasMore: true })
      .mockResolvedValueOnce({ items: [summary(3)], hasMore: false })
    const user = userEvent.setup()
    renderRoute('/workout/history')
    expect(await screen.findByRole('link', { name: /Workout 1/ })).toHaveTextContent(
      '45 min · 3 exercises',
    )
    await user.click(screen.getByRole('button', { name: 'Show older workouts' }))
    expect(await screen.findByRole('link', { name: /Workout 3/ })).toBeInTheDocument()
    expect(data.listSessions).toHaveBeenLastCalledWith('user-a', 1)
    expect(screen.queryByRole('button', { name: 'Show older workouts' })).not.toBeInTheDocument()
  })

  it('has an empty state', async () => {
    vi.mocked(data.listSessions).mockResolvedValue({ items: [], hasMore: false })
    renderRoute('/workout/history')
    expect(await screen.findByText('No workouts yet')).toBeInTheDocument()
  })

  it('shows exactly what was performed, and deletes after confirming', async () => {
    vi.mocked(data.getSession).mockResolvedValue({
      ...SESSION,
      completedAt: '2026-11-09T10:50:00Z',
      notes: 'Good one',
      exercises: [
        item('x1', {
          sets: [
            set({ reps: 5, weightValue: 60, weightUnit: 'kg' }),
            set({ setNumber: 2, reps: 5, weightValue: 135, weightUnit: 'lb' }),
          ],
        }),
        item('x2', { exerciseName: 'Hamstring Stretch', isSkipped: true }),
      ],
    })
    vi.mocked(data.deleteSession).mockResolvedValue()
    vi.mocked(data.listSessions).mockResolvedValue({ items: [], hasMore: false })
    const user = userEvent.setup()
    const { router } = renderRoute(`/workout/history/${SESSION_ID}`)
    expect(await screen.findByRole('heading', { name: 'Leg Day' })).toBeInTheDocument()
    expect(screen.getByText('5 × 60 kg')).toBeInTheDocument()
    expect(screen.getByText('5 × 135 lb')).toBeInTheDocument()
    expect(screen.getByText('Skipped', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('Good one')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete workout' }))
    await user.click(
      within(screen.getByRole('group', { name: 'Delete this workout?' })).getByRole('button', {
        name: 'Delete workout',
      }),
    )
    expect(data.deleteSession).toHaveBeenCalledWith('user-a', SESSION_ID)
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/workout/history'))
  })
})

describe('adding mid-workout', () => {
  it('adds an exercise from the library with its name', async () => {
    vi.mocked(data.addSessionExercise).mockResolvedValue(item('x3'))
    const user = userEvent.setup()
    renderRoute('/workout')
    await user.click(await screen.findByRole('link', { name: 'Add exercise' }))
    await user.type(await screen.findByRole('searchbox'), 'bench')
    await user.click(screen.getByRole('button', { name: 'Add: Dumbbell Bench Press' }))
    expect(data.addSessionExercise).toHaveBeenCalledWith(
      'user-a',
      SESSION_ID,
      { source: 'catalog', id: 'Dumbbell_Bench_Press' },
      'Dumbbell Bench Press',
    )
  })
})

describe('staying on an exercise', () => {
  it('stays on the exercise after its last target set, until Next', async () => {
    vi.mocked(data.getInProgressSession).mockResolvedValue({
      ...structuredClone(SESSION),
      exercises: [
        item('x1', { targets: { ...NO_TARGETS, targetSets: 1, targetReps: '5' } }),
        item('x2', { exerciseName: 'Hamstring Stretch', sortOrder: 1 }),
      ],
    })
    vi.mocked(data.saveSet).mockImplementation(async (exerciseId, setNumber, input) =>
      set({ ...input, sessionExerciseId: exerciseId, setNumber }),
    )
    const user = userEvent.setup()
    renderRoute('/workout')
    const form = await screen.findByRole('form', { name: 'Set 1 of 1' })
    await user.click(within(form).getByRole('button', { name: 'Complete set' }))
    expect(await screen.findByText('All 1 target sets done.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Barbell Squat' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next →' }))
    expect(await screen.findByRole('heading', { name: 'Hamstring Stretch' })).toBeInTheDocument()
  })
})
