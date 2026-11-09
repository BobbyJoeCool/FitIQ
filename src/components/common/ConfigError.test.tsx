import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ConfigError } from './ConfigError'

it('explains a missing environment instead of rendering a blank page', () => {
  render(<ConfigError problems={['VITE_SUPABASE_URL is not set.']} />)
  expect(screen.getByRole('alert')).toHaveTextContent('VITE_SUPABASE_URL is not set.')
  expect(screen.getByRole('heading')).toHaveTextContent("FitIQ isn't configured")
})
