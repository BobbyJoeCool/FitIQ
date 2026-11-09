import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { useAuth } from './AuthContext'

/** Renders children only with a session; otherwise sends the user to sign-in. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (user === undefined) return <LoadingScreen />
  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}
