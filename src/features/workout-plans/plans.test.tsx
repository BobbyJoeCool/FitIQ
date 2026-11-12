import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../../lib/data'
import type { Plan, PlanExercise, PlanWithExercises } from '../../lib/data'
import { LIBRARY } from '../../test/exerciseFixtures'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../lib/data')

const PLAN_ID = 'aaaaaaaa-0000-4000-8000-000000000001'

const plan = (overrides: Partial<Plan> = {}): Plan => ({
  id: PLAN_ID,
  name: 'Push Day',
  description: 'Chest, shoulders, triceps',
  isArchived: false,
  exerciseCount: 3,
  updatedAt: '2026-11-09T00:00:00Z',
  ...overrides,
})

const item = (id: string, overrides: Partial<PlanExercise> = {}): PlanExercise => ({
  id,
  planId: PLAN_ID,
  exercise: { source: 'catalog', id: 'Barbell_Squat' },
  sortOrder: 0,
  targetSets: null,
  targetReps: null,
  restSeconds: null,
  targetSeconds: null,
  targetReleaseSeconds: null,
  perSide: false,
  notes: null,
  ...overrides,
})

const BUILDER: PlanWithExercises = {
  ...plan(),
  exercises: [
    item('e1', {
      targetSets: 3,
      targetReps: '8-12',
      restSeconds: 90,
      notes: 'Pause at the bottom',
    }),
    item('e2', { exercise: { source: 'custom', id: LIBRARY[3].id }, sortOrder: 1 }),
    item('e3', { exercise: { source: 'catalog', id: 'Renamed_Exercise' }, sortOrder: 2 }),
  ],
}

const exerciseItems = () => within(screen.getByRole('list')).getAllByRole('listitem')
const itemNames = () =>
  exerciseItems().map((li) => li.querySelector('a, span[class*="itemName"]')?.textContent)

beforeEach(() => {
  vi.mocked(data.getCurrentUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.loadExerciseLibrary).mockResolvedValue(LIBRARY)
  vi.mocked(data.getMyPlan).mockResolvedValue(structuredClone(BUILDER))
  vi.mocked(data.isPlanUsed).mockResolvedValue(false)
  vi.mocked(data.listMyPlans).mockResolvedValue([])
})

describe('plans list', () => {
  it('guides you to create a first plan', async () => {
    renderRoute('/plans')
    expect(await screen.findByText('No plans yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first plan' })).toHaveAttribute(
      'href',
      '/plans/new',
    )
    expect(data.listMyPlans).toHaveBeenCalledWith('user-a')
  })

  it('lists plans with exercise counts and hides archived ones until asked', async () => {
    vi.mocked(data.listMyPlans).mockResolvedValue([
      plan({ exerciseCount: 1, description: null }),
      plan({ id: 'p2', name: 'Old Legs', isArchived: true, exerciseCount: 4 }),
    ])
    const user = userEvent.setup()
    renderRoute('/plans')

    const push = await screen.findByRole('link', { name: /Push Day/ })
    expect(push).toHaveAttribute('href', `/plans/${PLAN_ID}`)
    expect(push).toHaveTextContent('1 exercise')
    expect(screen.queryByText('Old Legs')).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Show archived (1)' }))
    expect(screen.getByRole('link', { name: /Old Legs/ })).toHaveTextContent('Archived')
  })

  it('shows an error with a retry', async () => {
    vi.mocked(data.listMyPlans).mockRejectedValueOnce(new Error('Network down'))
    const user = userEvent.setup()
    renderRoute('/plans')
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No plans yet')).toBeInTheDocument()
  })
})

describe('plan form', () => {
  it('validates before saving', async () => {
    const user = userEvent.setup()
    renderRoute('/plans/new')
    await user.click(await screen.findByRole('button', { name: 'Create plan' }))
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription(
      'For example: Push day, or Monday full body. Give the plan a name.',
    )
    expect(data.createPlan).not.toHaveBeenCalled()
  })

  it('creates a plan, opens it, and Back skips the form', async () => {
    vi.mocked(data.createPlan).mockResolvedValue(plan({ exerciseCount: 0 }))
    const user = userEvent.setup()
    const { router } = renderRoute('/plans')
    await user.click(await screen.findByRole('link', { name: 'Create your first plan' }))
    await user.type(await screen.findByLabelText('Name'), '  Push Day ')
    await user.click(screen.getByRole('button', { name: 'Create plan' }))

    expect(data.createPlan).toHaveBeenCalledWith({ name: 'Push Day', description: null })
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/plans/${PLAN_ID}`))
    await user.click(await screen.findByRole('link', { name: '← Plans' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/plans'))
  })

  it('edits a plan and returns to it', async () => {
    vi.mocked(data.updatePlan).mockResolvedValue()
    const user = userEvent.setup()
    const { router } = renderRoute(`/plans/${PLAN_ID}`)
    await user.click(await screen.findByRole('link', { name: 'Edit details' }))
    const name = await screen.findByLabelText('Name')
    expect(name).toHaveValue('Push Day')
    await user.clear(name)
    await user.type(name, 'Push Day A')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(data.updatePlan).toHaveBeenCalledWith('user-a', PLAN_ID, {
      name: 'Push Day A',
      description: 'Chest, shoulders, triceps',
    })
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/plans/${PLAN_ID}`))
    expect(router.state.historyAction).toBe('POP')
  })
})

describe('plan builder', () => {
  it('shows exercises in order with names, targets, and notes', async () => {
    renderRoute(`/plans/${PLAN_ID}`)
    expect(await screen.findByRole('heading', { name: 'Push Day' })).toBeInTheDocument()
    expect(data.getMyPlan).toHaveBeenCalledWith('user-a', PLAN_ID)
    expect(itemNames()).toEqual(['Barbell Squat', 'Walking Pad Incline Walk', 'Renamed Exercise'])

    const [first, second, third] = exerciseItems()
    expect(first).toHaveTextContent('3 × 8-12 · Rest 1:30')
    expect(first).toHaveTextContent('Pause at the bottom')
    expect(within(first).getByRole('link', { name: 'Barbell Squat' })).toHaveAttribute(
      'href',
      '/exercises/Barbell_Squat',
    )
    expect(second).toHaveTextContent('No targets yet')
    // An ID that isn't in the pinned catalog still shows, readably.
    expect(third).toHaveTextContent('Details unavailable')
    expect(within(third).queryByRole('link')).not.toBeInTheDocument()
  })

  it('still shows the plan when the exercise library fails to load', async () => {
    vi.mocked(data.loadExerciseLibrary).mockRejectedValue(new Error('CDN down'))
    renderRoute(`/plans/${PLAN_ID}`)
    expect(await screen.findByText(/Exercise details couldn't load/)).toBeInTheDocument()
    expect(itemNames()).toEqual(['Barbell Squat', 'Custom exercise', 'Renamed Exercise'])
  })

  it('edits targets with validation', async () => {
    vi.mocked(data.updatePlanExercise).mockImplementation(async (_user, id, targets) => ({
      ...BUILDER.exercises[1],
      id,
      ...targets,
    }))
    const user = userEvent.setup()
    renderRoute(`/plans/${PLAN_ID}`)
    await user.click(
      await screen.findByRole('button', { name: 'Edit targets for Walking Pad Incline Walk' }),
    )
    const editor = screen.getByRole('form', { name: 'Targets for Walking Pad Incline Walk' })
    await user.type(within(editor).getByLabelText('Sets'), '0')
    await user.click(within(editor).getByRole('button', { name: 'Save targets' }))
    expect(within(editor).getByLabelText('Sets')).toHaveAccessibleDescription(
      'Use a whole number from 1 to 20.',
    )
    expect(data.updatePlanExercise).not.toHaveBeenCalled()

    await user.clear(within(editor).getByLabelText('Sets'))
    await user.type(within(editor).getByLabelText('Sets'), '3')
    await user.type(within(editor).getByLabelText('Reps'), '30 s')
    await user.type(within(editor).getByLabelText('Rest (sec)'), '45')
    await user.click(within(editor).getByRole('button', { name: 'Save targets' }))

    expect(data.updatePlanExercise).toHaveBeenCalledWith('user-a', 'e2', {
      targetSets: 3,
      targetReps: '30 s',
      restSeconds: 45,
      targetSeconds: null,
      targetReleaseSeconds: null,
      perSide: false,
      notes: null,
    })
    expect(await screen.findByText('3 × 30 s · Rest 45 s')).toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('moves exercises and saves the order', async () => {
    vi.mocked(data.reorderPlanExercises).mockResolvedValue()
    const user = userEvent.setup()
    renderRoute(`/plans/${PLAN_ID}`)
    expect(await screen.findByRole('button', { name: 'Move Barbell Squat up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Renamed Exercise down' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Move Barbell Squat down' }))
    expect(itemNames()).toEqual(['Walking Pad Incline Walk', 'Barbell Squat', 'Renamed Exercise'])
    expect(data.reorderPlanExercises).toHaveBeenCalledWith(PLAN_ID, ['e2', 'e1', 'e3'])
    expect(await screen.findByText('Moved Barbell Squat to position 2 of 3.')).toBeInTheDocument()
  })

  it('puts the order back if saving it fails', async () => {
    vi.mocked(data.reorderPlanExercises).mockRejectedValue(new Error('Offline'))
    const user = userEvent.setup()
    renderRoute(`/plans/${PLAN_ID}`)
    await user.click(await screen.findByRole('button', { name: 'Move Renamed Exercise up' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
    expect(itemNames()).toEqual(['Barbell Squat', 'Walking Pad Incline Walk', 'Renamed Exercise'])
  })

  it('removes an exercise after confirming', async () => {
    vi.mocked(data.removePlanExercise).mockResolvedValue()
    const user = userEvent.setup()
    renderRoute(`/plans/${PLAN_ID}`)
    await user.click(await screen.findByRole('button', { name: 'Remove Barbell Squat' }))
    await user.click(screen.getByRole('button', { name: 'Keep' }))
    expect(data.removePlanExercise).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Remove Barbell Squat' }))
    const confirm = screen.getByRole('group', { name: 'Remove Barbell Squat?' })
    await user.click(within(confirm).getByRole('button', { name: 'Remove' }))
    expect(data.removePlanExercise).toHaveBeenCalledWith('user-a', 'e1')
    await vi.waitFor(() =>
      expect(itemNames()).toEqual(['Walking Pad Incline Walk', 'Renamed Exercise']),
    )
  })

  it('archives and restores the plan', async () => {
    vi.mocked(data.setPlanArchived).mockResolvedValue()
    const user = userEvent.setup()
    renderRoute(`/plans/${PLAN_ID}`)
    await user.click(await screen.findByRole('button', { name: 'Archive' }))
    expect(data.setPlanArchived).toHaveBeenCalledWith('user-a', PLAN_ID, true)
    expect(await screen.findByText(/Archived plans are hidden from your list/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restore' }))
    expect(data.setPlanArchived).toHaveBeenLastCalledWith('user-a', PLAN_ID, false)
    expect(await screen.findByRole('button', { name: 'Archive' })).toBeInTheDocument()
  })

  it('guides an empty plan to add exercises', async () => {
    vi.mocked(data.getMyPlan).mockResolvedValue({ ...BUILDER, exercises: [] })
    renderRoute(`/plans/${PLAN_ID}`)
    expect(await screen.findByText('No exercises yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add exercises' })).toHaveAttribute(
      'href',
      `/plans/${PLAN_ID}/add`,
    )
  })

  it("treats another user's or a missing plan as not found", async () => {
    vi.mocked(data.getMyPlan).mockResolvedValue(null)
    renderRoute('/plans/someone-elses')
    expect(await screen.findByText('Plan not found')).toBeInTheDocument()
  })

  it('links to an exercise and back to the plan', async () => {
    vi.mocked(data.getCatalogExercise).mockResolvedValue(LIBRARY[0])
    const user = userEvent.setup()
    const { router } = renderRoute(`/plans/${PLAN_ID}`)
    await user.click(await screen.findByRole('link', { name: 'Barbell Squat' }))
    await user.click(await screen.findByRole('link', { name: '← Push Day' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/plans/${PLAN_ID}`))
  })
})

describe('add exercises to a plan', () => {
  it('searches the library and adds exercises', async () => {
    vi.mocked(data.addExerciseToPlan).mockResolvedValue(item('new'))
    const user = userEvent.setup()
    const { router } = renderRoute(`/plans/${PLAN_ID}`)
    await user.click(await screen.findByRole('link', { name: 'Add exercises' }))
    await screen.findByRole('heading', { name: 'Add exercises' })

    // Archived custom exercises stay out; exercises already in the plan say so.
    expect(screen.queryByText('Old Band Pull')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add again: Barbell Squat' })).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox'), 'bench')
    expect(screen.getByText('1 exercises')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add: Dumbbell Bench Press' }))
    expect(data.addExerciseToPlan).toHaveBeenCalledWith('user-a', PLAN_ID, {
      source: 'catalog',
      id: 'Dumbbell_Bench_Press',
    })
    expect(await screen.findByText('Added')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Done (1 added)' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/plans/${PLAN_ID}`))
    expect(router.state.historyAction).toBe('POP')
  })

  it('puts Done in the side navigation on wider screens', async () => {
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: query === '(min-width: 640px)',
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    )
    renderRoute(`/plans/${PLAN_ID}/add`)
    const sideNav = await screen.findByRole('navigation', { name: 'Main' })
    expect(await within(sideNav).findByRole('link', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Done' })).toHaveLength(1)
    vi.unstubAllGlobals()
  })

  it('adds a custom exercise by its ID', async () => {
    vi.mocked(data.addExerciseToPlan).mockResolvedValue(item('new'))
    const user = userEvent.setup()
    renderRoute(`/plans/${PLAN_ID}/add`)
    await user.type(await screen.findByRole('searchbox'), 'walking')
    await user.click(screen.getByRole('button', { name: /Walking Pad Incline Walk/ }))
    expect(data.addExerciseToPlan).toHaveBeenCalledWith('user-a', PLAN_ID, {
      source: 'custom',
      id: LIBRARY[3].id,
    })
  })
})

describe('add to plan from an exercise', () => {
  it('lists active plans and adds the exercise', async () => {
    vi.mocked(data.getCatalogExercise).mockResolvedValue(LIBRARY[0])
    vi.mocked(data.listMyPlans).mockResolvedValue([
      plan(),
      plan({ id: 'p2', name: 'Old Legs', isArchived: true }),
    ])
    vi.mocked(data.addExerciseToPlan).mockResolvedValue(item('new'))
    const user = userEvent.setup()
    renderRoute('/exercises/Barbell_Squat')

    await user.click(await screen.findByRole('button', { name: 'Add to plan' }))
    const choices = await screen.findByRole('list', { name: 'Add Barbell Squat to:' })
    expect(within(choices).getAllByRole('button')).toHaveLength(1)
    await user.click(within(choices).getByRole('button', { name: /Push Day/ }))

    expect(data.addExerciseToPlan).toHaveBeenCalledWith('user-a', PLAN_ID, {
      source: 'catalog',
      id: 'Barbell_Squat',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Added to Push Day.')
    expect(within(choices).getByRole('button', { name: /Push Day/ })).toHaveTextContent(
      '4 exercises',
    )
    expect(screen.getByRole('link', { name: 'Open plan' })).toHaveAttribute(
      'href',
      `/plans/${PLAN_ID}`,
    )
  })

  it('offers to create a plan when there are none', async () => {
    vi.mocked(data.getCatalogExercise).mockResolvedValue(LIBRARY[0])
    const user = userEvent.setup()
    renderRoute('/exercises/Barbell_Squat')
    await user.click(await screen.findByRole('button', { name: 'Add to plan' }))
    expect(await screen.findByRole('link', { name: 'Create a plan' })).toHaveAttribute(
      'href',
      '/plans/new',
    )
  })

  it('is not offered on an archived custom exercise', async () => {
    vi.mocked(data.getMyCustomExercise).mockResolvedValue(LIBRARY[4])
    renderRoute(`/exercises/custom/${LIBRARY[4].id}`)
    await screen.findByRole('heading', { name: 'Old Band Pull' })
    expect(screen.queryByRole('button', { name: 'Add to plan' })).not.toBeInTheDocument()
  })
})

describe('starter plans', () => {
  it('copies the full-body stretch into your plans', async () => {
    const stretchIds = [
      'Side_Neck_Stretch',
      'Elbows_Back',
      'Shoulder_Stretch',
      'Triceps_Stretch',
      'Upper_Back_Stretch',
      'Standing_Lateral_Stretch',
      'Calf_Stretch_Hands_Against_Wall',
      'Kneeling_Hip_Flexor',
      'On_Your_Side_Quad_Stretch',
      'Hamstring_Stretch',
      'Knee_Across_The_Body',
      'Side_Lying_Groin_Stretch',
      'Cat_Stretch',
      'Childs_Pose',
    ]
    vi.mocked(data.loadCatalog).mockResolvedValue(
      stretchIds.map((id) => ({ ...LIBRARY[0], id, name: id.replace(/_/g, ' ') })),
    )
    vi.mocked(data.createPlan).mockResolvedValue(plan({ name: 'Full-body stretch' }))
    vi.mocked(data.addExercisesToPlan).mockResolvedValue()
    const user = userEvent.setup()
    const { router } = renderRoute('/plans')
    await user.click(await screen.findByRole('link', { name: 'Use a starter plan' }))

    const card = await screen.findByRole('article', { name: 'Full-body stretch' })
    expect(within(card).getAllByRole('listitem')).toHaveLength(14)
    expect(within(card).getAllByRole('listitem')[0]).toHaveTextContent(
      'Side Neck Stretch · 1 × 30 s each side · Rest none',
    )
    await user.click(within(card).getByRole('button', { name: 'Add to my plans' }))

    expect(data.createPlan).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Full-body stretch' }),
    )
    const [, planId, items] = vi.mocked(data.addExercisesToPlan).mock.calls[0]
    expect(planId).toBe(PLAN_ID)
    expect(items.map((i) => i.exercise.id)).toEqual(stretchIds)
    expect(items[0].targets).toMatchObject({ targetSeconds: 30, perSide: true, targetSets: 1 })
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/plans/${PLAN_ID}`))
  })

  it('saves hold targets from the targets editor', async () => {
    vi.mocked(data.updatePlanExercise).mockImplementation(async (_user, id, targets) => ({
      ...BUILDER.exercises[1],
      id,
      ...targets,
    }))
    const user = userEvent.setup()
    renderRoute(`/plans/${PLAN_ID}`)
    await user.click(
      await screen.findByRole('button', { name: 'Edit targets for Walking Pad Incline Walk' }),
    )
    const editor = screen.getByRole('form', { name: 'Targets for Walking Pad Incline Walk' })
    await user.type(within(editor).getByLabelText('Sets'), '2')
    await user.type(within(editor).getByLabelText('Hold (sec)'), '30')
    await user.click(within(editor).getByRole('checkbox', { name: 'Each side (left and right)' }))
    await user.click(within(editor).getByRole('button', { name: 'Save targets' }))
    expect(data.updatePlanExercise).toHaveBeenCalledWith(
      'user-a',
      'e2',
      expect.objectContaining({ targetSets: 2, targetSeconds: 30, perSide: true }),
    )
    expect(await screen.findByText('2 × 30 s each side')).toBeInTheDocument()
  })

  it('filters the picker by movement type', async () => {
    const user = userEvent.setup()
    renderRoute(`/plans/${PLAN_ID}/add`)
    await user.selectOptions(await screen.findByLabelText('Movement type'), 'stretching')
    expect(screen.getByText('1 exercises')).toBeInTheDocument()
    expect(screen.getByText('Hamstring Stretch')).toBeInTheDocument()
  })
})

describe('sharing a plan as a file (FV-15)', () => {
  it('downloads the plan as JSON, with custom exercises copied in', async () => {
    let saved: Blob | null = null
    const createObjectURL = vi.fn((blob: Blob) => {
      saved = blob
      return 'blob:plan'
    })
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const user = userEvent.setup()
    renderRoute(`/plans/${PLAN_ID}`)
    await user.click(await screen.findByRole('button', { name: 'Share as file' }))
    expect(saved).not.toBeNull()
    const file = JSON.parse(await (saved as unknown as Blob).text())
    expect(file).toMatchObject({ format: 'fitiq-plan', version: 1, name: 'Push Day' })
    expect(file.exercises).toHaveLength(3)
    expect(file.exercises[0]).toMatchObject({ catalogId: 'Barbell_Squat', sets: 3, reps: '8-12' })
    expect(file.exercises[1].custom).toMatchObject({ name: 'Walking Pad Incline Walk' })
  })
})

describe('deleting an unused plan (FV-6)', () => {
  it('deletes a plan no workout has used, after confirming', async () => {
    vi.mocked(data.deletePlan).mockResolvedValue()
    const user = userEvent.setup()
    renderRoute(`/plans/${PLAN_ID}`)
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    const confirm = screen.getByRole('group', { name: 'Delete this plan?' })
    await user.click(within(confirm).getByRole('button', { name: 'Keep it' }))
    expect(data.deletePlan).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete plan' }))
    expect(data.deletePlan).toHaveBeenCalledWith('user-a', PLAN_ID)
    expect(await screen.findByRole('heading', { name: 'Plans' })).toBeInTheDocument()
  })

  it('offers only archive for a plan a workout used', async () => {
    vi.mocked(data.isPlanUsed).mockResolvedValue(true)
    renderRoute(`/plans/${PLAN_ID}`)
    expect(await screen.findByText(/can be archived but not deleted/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument()
  })

  it('hides Delete when it cannot tell whether a workout used the plan', async () => {
    vi.mocked(data.isPlanUsed).mockRejectedValue(new Error('offline'))
    renderRoute(`/plans/${PLAN_ID}`)
    expect(await screen.findByRole('button', { name: 'Archive' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('explains when the database refuses because a workout started meanwhile', async () => {
    vi.mocked(data.deletePlan).mockRejectedValue(
      new Error(
        "This plan has been used in a workout, so it can't be deleted. Archive it instead.",
      ),
    )
    const user = userEvent.setup()
    renderRoute(`/plans/${PLAN_ID}`)
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete plan' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Archive it instead.')
  })
})
