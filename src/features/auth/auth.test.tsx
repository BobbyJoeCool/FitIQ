import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../../lib/data'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../lib/data')

const alex = { id: 'user-a', email: 'a@example.com' }

beforeEach(() => {
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.checkConnection).mockResolvedValue({ ok: true, serverTime: 'now' })
  vi.mocked(data.getMyProfile).mockResolvedValue(null)
})

describe('auth states', () => {
  it('shows a loading state while the stored session is read', () => {
    vi.mocked(data.getCurrentUser).mockReturnValue(new Promise(() => {}))
    renderRoute('/')
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })

  it('sends signed-out users to sign-in from any screen', async () => {
    vi.mocked(data.getCurrentUser).mockResolvedValue(null)
    const { router } = renderRoute('/plans')
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('offers no public registration', async () => {
    vi.mocked(data.getCurrentUser).mockResolvedValue(null)
    renderRoute('/sign-in')
    await screen.findByRole('button', { name: 'Sign in' })
    expect(screen.queryByText(/sign up|create account|register/i)).not.toBeInTheDocument()
  })

  it('signs in and returns to the screen the user asked for', async () => {
    vi.mocked(data.getCurrentUser).mockResolvedValue(null)
    vi.mocked(data.signIn).mockResolvedValue(alex)
    const user = userEvent.setup()
    const { router } = renderRoute('/plans')

    await user.type(await screen.findByLabelText('Email'), ' a@example.com ')
    await user.type(screen.getByLabelText('Password'), 'pw')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Plans' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/plans')
    expect(data.signIn).toHaveBeenCalledWith('a@example.com', 'pw')
  })

  it('shows the error when sign-in fails', async () => {
    vi.mocked(data.getCurrentUser).mockResolvedValue(null)
    vi.mocked(data.signIn).mockRejectedValue(
      new Error('That email and password do not match an account.'),
    )
    const user = userEvent.setup()
    renderRoute('/sign-in')

    await user.type(await screen.findByLabelText('Email'), 'a@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('do not match')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('keeps a stored session across a reload', async () => {
    vi.mocked(data.getCurrentUser).mockResolvedValue(alex)
    renderRoute('/cardio')
    expect(await screen.findByRole('heading', { name: 'Cardio' })).toBeInTheDocument()
  })

  it('signs out back to the sign-in screen', async () => {
    vi.mocked(data.getCurrentUser).mockResolvedValue(alex)
    vi.mocked(data.signOut).mockResolvedValue()
    const user = userEvent.setup()
    const { router } = renderRoute('/settings')

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  it('a signed-in user visiting sign-in goes to the dashboard', async () => {
    vi.mocked(data.getCurrentUser).mockResolvedValue(alex)
    renderRoute('/sign-in')
    expect(await screen.findByTestId('connection-status')).toBeInTheDocument()
  })
})
