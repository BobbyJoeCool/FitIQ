import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../lib/data'
import { renderRoute } from '../test/renderRoute'
import { NAV_ITEMS } from './navigation'

vi.mock('../lib/data')

beforeEach(() => {
  vi.mocked(data.getCurrentUser).mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
  vi.mocked(data.onAuthChange).mockReturnValue(() => {})
  vi.mocked(data.listMyPlans).mockResolvedValue([])
  vi.mocked(data.loadExerciseLibrary).mockResolvedValue([])
  vi.mocked(data.checkConnection).mockResolvedValue({ ok: true, serverTime: 'now' })
  vi.mocked(data.getMyProfile).mockResolvedValue({
    id: 'user-a',
    displayName: 'Alex',
    weightUnit: 'lb',
    lengthUnit: 'in',
  })
})

describe('AppShell navigation', () => {
  it('has a link to every screen in the side navigation', async () => {
    renderRoute('/')
    const sidebar = await screen.findByRole('navigation', { name: 'Main' })
    for (const item of NAV_ITEMS) {
      expect(within(sidebar).getByRole('link', { name: item.label })).toBeInTheDocument()
    }
  })

  it('puts every screen in either the bottom tab bar or the phone header', async () => {
    renderRoute('/')
    const tabs = await screen.findByRole('navigation', { name: 'Tabs' })
    const header = screen.getByRole('navigation', { name: 'Account' })
    for (const item of NAV_ITEMS) {
      const container = item.inBottomBar ? tabs : header
      expect(within(container).getByRole('link', { name: item.label })).toBeInTheDocument()
    }
  })

  it('navigates between screens and marks the current one', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    const tabs = await screen.findByRole('navigation', { name: 'Tabs' })

    await user.click(within(tabs).getByRole('link', { name: 'Exercises' }))
    expect(await screen.findByRole('heading', { name: 'Exercises' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/exercises')
    expect(within(tabs).getByRole('link', { name: 'Exercises' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await user.click(within(tabs).getByRole('link', { name: 'Workout' }))
    expect(await screen.findByRole('heading', { name: 'Workout' })).toBeInTheDocument()

    const header = screen.getByRole('navigation', { name: 'Account' })
    await user.click(within(header).getByRole('link', { name: 'Settings' }))
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('loads a nested route directly, as after a refresh', async () => {
    renderRoute('/progress')
    expect(await screen.findByRole('heading', { name: 'Progress' })).toBeInTheDocument()
  })

  it('shows a not-found page for unknown routes', async () => {
    renderRoute('/nope')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('shows the database connection status on the dashboard', async () => {
    renderRoute('/')
    expect(await screen.findByText('Database: connected')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Hi, Alex' })).toBeInTheDocument()
  })
})
