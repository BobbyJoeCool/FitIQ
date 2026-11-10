import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../../lib/data'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../lib/data')

const alex = { id: 'user-a', email: 'a@example.com' }

beforeEach(() => {
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.getCurrentUser).mockResolvedValue(null)
})

describe('password reset and invites (2.4)', () => {
  it('requests a reset link without revealing whether the account exists', async () => {
    vi.mocked(data.requestPasswordReset).mockResolvedValue()
    const user = userEvent.setup()
    renderRoute('/sign-in')
    await user.click(await screen.findByRole('link', { name: 'Forgot your password?' }))
    await user.type(screen.getByLabelText('Email'), ' a@example.com ')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(data.requestPasswordReset).toHaveBeenCalledWith('a@example.com')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'If that address has a FitIQ account, a reset link is on its way.',
    )
  })

  it('verifies an invite link once, then asks for a password', async () => {
    vi.mocked(data.verifyEmailLink).mockImplementation(async () => {
      vi.mocked(data.getCurrentUser).mockResolvedValue(alex)
      return alex
    })
    const { router } = renderRoute('/auth/confirm?token_hash=abc&type=invite')
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/set-password'))
    expect(data.verifyEmailLink).toHaveBeenCalledTimes(1)
    expect(data.verifyEmailLink).toHaveBeenCalledWith('abc', 'invite')
  })

  it('explains an expired or reused link', async () => {
    vi.mocked(data.verifyEmailLink).mockRejectedValue(
      new Error('This link has expired or was already used. Ask for a new one.'),
    )
    renderRoute('/auth/confirm?token_hash=abc&type=recovery')
    expect(await screen.findByRole('alert')).toHaveTextContent('expired or was already used')
    expect(screen.getByRole('link', { name: 'Get a new reset link' })).toBeInTheDocument()
  })

  it('rejects an incomplete link without calling Supabase', async () => {
    renderRoute('/auth/confirm?type=invite')
    expect(await screen.findByRole('alert')).toHaveTextContent('This link is incomplete')
    expect(data.verifyEmailLink).not.toHaveBeenCalled()
  })

  it('sets a password with length and match checks', async () => {
    vi.mocked(data.getCurrentUser).mockResolvedValue(alex)
    vi.mocked(data.updatePassword).mockResolvedValue()
    vi.mocked(data.checkConnection).mockResolvedValue({ ok: true, serverTime: 'now' })
    vi.mocked(data.getMyProfile).mockResolvedValue(null)
    const user = userEvent.setup()
    const { router } = renderRoute('/set-password')

    await user.type(await screen.findByLabelText('New password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Save password' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 10 characters.')

    await user.clear(screen.getByLabelText('New password'))
    await user.type(screen.getByLabelText('New password'), 'long enough pw')
    await user.type(screen.getByLabelText('Confirm password'), 'different pw!!')
    await user.click(screen.getByRole('button', { name: 'Save password' }))
    expect(screen.getByRole('alert')).toHaveTextContent("The two passwords don't match.")

    await user.clear(screen.getByLabelText('Confirm password'))
    await user.type(screen.getByLabelText('Confirm password'), 'long enough pw')
    await user.click(screen.getByRole('button', { name: 'Save password' }))
    expect(data.updatePassword).toHaveBeenCalledWith('long enough pw')
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
