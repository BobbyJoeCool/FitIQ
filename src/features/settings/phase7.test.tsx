import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../../lib/data'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../lib/data')

const profile = {
  id: 'user-a',
  displayName: null,
  weightUnit: 'lb' as const,
  lengthUnit: 'in' as const,
}

beforeEach(() => {
  vi.mocked(data.getCurrentUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.getMyProfile).mockResolvedValue(profile)
  vi.mocked(data.listCardio).mockResolvedValue({ items: [], hasMore: false })
  vi.mocked(data.listCardioSince).mockResolvedValue([])
  vi.mocked(data.listWeighIns).mockResolvedValue({ items: [], hasMore: false })
  vi.mocked(data.getWeighInSeries).mockResolvedValue([])
})

describe('cardio (7.1)', () => {
  it('pre-fills the walking pad preset and saves a session', async () => {
    vi.mocked(data.createCardio).mockImplementation(async (input) => ({ id: 'c1', ...input }))
    const user = userEvent.setup()
    renderRoute('/cardio')
    const form = await screen.findByRole('form', { name: 'Log cardio' })
    expect(within(form).queryByLabelText('Incline % (optional)')).toBeInTheDocument() // walk has incline
    await user.click(within(form).getByRole('button', { name: 'Walking pad preset' }))
    expect(within(form).getByLabelText('Activity')).toHaveValue('walking_pad')
    expect(within(form).getByLabelText('Minutes')).toHaveValue('30')
    expect(within(form).getByLabelText('Incline % (optional)')).toHaveValue('0')
    expect(within(form).getByLabelText('Unit')).toHaveValue('mi')

    await user.type(within(form).getByLabelText('Distance (optional)'), '1.4')
    await user.click(within(form).getByRole('button', { name: 'Save session' }))
    expect(data.createCardio).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: 'walking_pad',
        durationSeconds: 1800,
        distanceValue: 1.4,
        distanceUnit: 'mi',
        incline: 0,
      }),
    )
  })

  it('validates like the database and hides incline where it makes no sense', async () => {
    const user = userEvent.setup()
    renderRoute('/cardio')
    const form = await screen.findByRole('form', { name: 'Log cardio' })
    await user.selectOptions(within(form).getByLabelText('Activity'), 'cycle')
    expect(within(form).queryByLabelText('Incline % (optional)')).not.toBeInTheDocument()
    await user.click(within(form).getByRole('button', { name: 'Save session' }))
    expect(within(form).getByLabelText('Minutes')).toHaveAccessibleDescription(
      'Enter how long, in minutes.',
    )
    expect(data.createCardio).not.toHaveBeenCalled()
  })

  it('lists history with weekly totals, and deletes after confirming', async () => {
    const session = {
      id: 'c1',
      activity: 'walking_pad' as const,
      startedAt: new Date().toISOString(),
      durationSeconds: 2700,
      distanceValue: 2.5,
      distanceUnit: 'km' as const,
      incline: 3,
      notes: null,
    }
    vi.mocked(data.listCardio).mockResolvedValue({ items: [session], hasMore: false })
    vi.mocked(data.listCardioSince).mockResolvedValue([session])
    vi.mocked(data.deleteCardio).mockResolvedValue()
    const user = userEvent.setup()
    renderRoute('/cardio')
    expect(
      await screen.findByText('Walking pad · 45 min · 2.5 km · 3 % incline'),
    ).toBeInTheDocument()
    // Weekly distance converts km to the preferred miles.
    expect(screen.getByText('1.6 mi')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Delete walking pad from/ }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(data.deleteCardio).toHaveBeenCalledWith('user-a', 'c1')
  })
})

describe('settings and units (7.2)', () => {
  it('saves the display name and units, and every screen follows', async () => {
    vi.mocked(data.updateMyProfile).mockImplementation(async (_id, update) => ({
      ...profile,
      ...update,
    }))
    vi.mocked(data.getWeighInSeries).mockResolvedValue([
      { id: 'w', recordedAt: '2026-11-01T08:00:00Z', value: 180, unit: 'lb', notes: null },
      { id: 'w2', recordedAt: '2026-11-08T08:00:00Z', value: 178, unit: 'lb', notes: null },
    ])
    const user = userEvent.setup()
    const { router } = renderRoute('/settings')
    const form = await screen.findByRole('form', { name: 'Profile and units' })
    await user.type(within(form).getByLabelText('Display name (optional)'), 'Alex')
    await user.click(within(form).getByRole('radio', { name: 'Kilograms (kg)' }))
    await user.click(within(form).getByRole('radio', { name: 'Centimetres and kilometres' }))
    await user.click(within(form).getByRole('button', { name: 'Save settings' }))
    expect(data.updateMyProfile).toHaveBeenCalledWith('user-a', {
      displayName: 'Alex',
      weightUnit: 'kg',
      lengthUnit: 'cm',
    })
    expect(await within(form).findByRole('status')).toHaveTextContent('Saved.')

    // Stored pounds now display as kilograms; nothing was rewritten.
    await router.navigate('/progress/weight')
    expect(await screen.findByRole('group', { name: /Weight in kg chart/ })).toBeInTheDocument()
    expect(data.updateWeighIn).not.toHaveBeenCalled()
  })

  it('explains privacy and offers install steps and a password change', async () => {
    renderRoute('/settings')
    expect(await screen.findByText(/private to your account/)).toBeInTheDocument()
    expect(screen.getByText(/no ads, no analytics/)).toBeInTheDocument()
    expect(screen.getByText(/tap Share, then Add to Home Screen/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Change password' })).toHaveAttribute(
      'href',
      '/set-password',
    )
  })
})
