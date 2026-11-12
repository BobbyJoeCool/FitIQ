import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../../lib/data'
import { loadSoundSettings } from '../../lib/sound/soundSettings'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../lib/data')

beforeEach(() => {
  window.localStorage.clear()
  vi.mocked(data.getCurrentUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.getMyProfile).mockResolvedValue({
    id: 'user-a',
    displayName: null,
    weightUnit: 'lb',
    lengthUnit: 'in',
    deletionRequestedAt: null,
  })
})

describe('Settings → Sound (FV-14)', () => {
  it('saves the voice, tones and volume on this device', async () => {
    const user = userEvent.setup()
    renderRoute('/settings')
    const voice = await screen.findByRole('checkbox', { name: /Voice cues/ })
    expect(voice).toBeChecked()
    await user.click(voice)
    await user.click(screen.getByRole('checkbox', { name: /countdown tones/ }))
    expect(loadSoundSettings()).toMatchObject({ voice: false, tones: false })
    expect(screen.getByRole('button', { name: 'Test sound' })).toBeDisabled()
  })
})
