import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../app/routes'
import { AuthProvider } from '../features/auth/AuthProvider'

/** Renders the real route tree at `path`. Tests mock `src/lib/data` themselves. */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const result = render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return { ...result, router }
}
