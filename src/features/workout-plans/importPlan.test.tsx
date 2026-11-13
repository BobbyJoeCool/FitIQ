import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../../lib/data'
import { NO_TARGETS } from '../../lib/data/plans'
import { LIBRARY, makeExercise } from '../../test/exerciseFixtures'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../lib/data')

const NEW_PLAN = {
  id: 'aaaaaaaa-0000-4000-8000-0000000000aa',
  name: 'Shared Legs',
  description: null,
  isArchived: false,
  exerciseCount: 0,
  updatedAt: '2026-11-12T00:00:00Z',
}

beforeEach(() => {
  vi.mocked(data.getCurrentUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.loadExerciseLibrary).mockResolvedValue(LIBRARY)
  vi.mocked(data.getMyPlan).mockResolvedValue(null)
  vi.mocked(data.isPlanUsed).mockResolvedValue(false)
  vi.mocked(data.createPlan).mockResolvedValue(NEW_PLAN)
  vi.mocked(data.addExercisesToPlan).mockResolvedValue()
  vi.mocked(data.createCustomExercise).mockResolvedValue(
    makeExercise({ id: 'new-custom', source: 'custom', name: 'Sled Push' }),
  )
})

const planFile = (body: object) =>
  new File(
    [JSON.stringify({ format: 'fitiq-plan', version: 1, ...body })],
    'legs.fitiq-plan.json',
    {
      type: 'application/json',
    },
  )

describe('importing a plan (FV-15)', () => {
  it('previews the file, then creates the plan and any new custom exercises once', async () => {
    const user = userEvent.setup()
    renderRoute('/plans/import')
    await user.upload(
      await screen.findByLabelText('Plan file'),
      planFile({
        name: 'Shared Legs',
        exercises: [
          { catalogId: 'Barbell_Squat', sets: 3, reps: '5' },
          { catalogId: 'Gone_From_Catalog', name: 'Old Move' },
          { custom: { name: 'Sled Push', primaryMuscles: ['quadriceps'] }, sets: 2 },
          { custom: { name: 'Sled Push', primaryMuscles: ['quadriceps'] }, sets: 1 },
        ],
      }),
    )
    const preview = await screen.findByRole('article', { name: 'Shared Legs' })
    const items = within(preview)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(items[0]).toContain('Barbell Squat')
    expect(items[1]).toContain('not in the library: skipped')
    expect(items[2]).toContain('new custom exercise')
    expect(preview).toHaveTextContent(
      "1 exercise isn't in the library and will be skipped. 1 custom exercise will be added to your library.",
    )
    expect(data.createPlan).not.toHaveBeenCalled()

    await user.click(within(preview).getByRole('button', { name: 'Import plan' }))
    expect(await screen.findByText('Plan not found')).toBeInTheDocument() // navigated to the new plan
    expect(data.createCustomExercise).toHaveBeenCalledTimes(1)
    expect(data.createPlan).toHaveBeenCalledWith({ name: 'Shared Legs', description: null })
    expect(data.addExercisesToPlan).toHaveBeenCalledWith('user-a', NEW_PLAN.id, [
      {
        exercise: { source: 'catalog', id: 'Barbell_Squat' },
        targets: { ...NO_TARGETS, targetSets: 3, targetReps: '5' },
      },
      {
        exercise: { source: 'custom', id: 'new-custom' },
        targets: { ...NO_TARGETS, targetSets: 2 },
      },
      {
        exercise: { source: 'custom', id: 'new-custom' },
        targets: { ...NO_TARGETS, targetSets: 1 },
      },
    ])
  })

  it('explains a file it cannot import, and saves nothing', async () => {
    const user = userEvent.setup()
    renderRoute('/plans/import')
    await user.upload(
      await screen.findByLabelText('Plan file'),
      new File(['{"hello": 1}'], 'x.json', { type: 'application/json' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent("isn't a FitIQ plan")
    expect(screen.queryByRole('button', { name: 'Import plan' })).not.toBeInTheDocument()
    expect(data.createPlan).not.toHaveBeenCalled()
  })
})
