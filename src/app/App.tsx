import { useMemo } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../features/auth/AuthProvider'
import { routes } from './routes'

/** Router basename from Vite's base ("/" or "/FitIQ/"), without the trailing slash. */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export function App() {
  const router = useMemo(() => createBrowserRouter(routes, { basename }), [])
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
