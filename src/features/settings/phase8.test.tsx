import { screen } from '@testing-library/react'
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
  deletionRequestedAt: null,
}

beforeEach(() => {
  vi.mocked(data.getCurrentUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.getMyProfile).mockResolvedValue(profile)
})

describe('CSV export (8.2)', () => {
  it('downloads only your weigh-ins as a CSV file', async () => {
    vi.mocked(data.listAllWeighIns).mockResolvedValue([
      { id: 'w', recordedAt: '2026-11-09T13:00:00.000Z', value: 180, unit: 'lb', notes: null },
    ])
    const created: Blob[] = []
    const createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob)
      return 'blob:fitiq'
    })
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    renderRoute('/settings')
    await user.click(await screen.findByRole('button', { name: 'Weigh-ins' }))

    expect(data.listAllWeighIns).toHaveBeenCalledWith('user-a')
    expect(click).toHaveBeenCalled()
    const text = await created[0].text()
    expect(text).toContain('weight,weight_unit')
    expect(text).toContain('180,lb')
    click.mockRestore()
  })
})

describe('account deletion request (8.3)', () => {
  it('explains what happens and needs DELETE typed before requesting', async () => {
    vi.mocked(data.setDeletionRequested).mockResolvedValue({
      ...profile,
      deletionRequestedAt: '2026-11-09T13:00:00.000Z',
    })
    const user = userEvent.setup()
    renderRoute('/settings')
    expect(await screen.findByText(/permanently removed/)).toBeInTheDocument()
    const request = screen.getByRole('button', { name: 'Request account deletion' })
    expect(request).toBeDisabled()
    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE')
    await user.click(request)
    expect(data.setDeletionRequested).toHaveBeenCalledWith('user-a', true)
    expect(await screen.findByText(/You asked for your account to be deleted/)).toBeInTheDocument()
  })

  it('lets a pending request be cancelled', async () => {
    vi.mocked(data.getMyProfile).mockResolvedValue({
      ...profile,
      deletionRequestedAt: '2026-11-09T13:00:00.000Z',
    })
    vi.mocked(data.setDeletionRequested).mockResolvedValue(profile)
    const user = userEvent.setup()
    renderRoute('/settings')
    await user.click(await screen.findByRole('button', { name: 'Cancel the request' }))
    expect(data.setDeletionRequested).toHaveBeenCalledWith('user-a', false)
    expect(
      await screen.findByRole('button', { name: 'Request account deletion' }),
    ).toBeInTheDocument()
  })
})
