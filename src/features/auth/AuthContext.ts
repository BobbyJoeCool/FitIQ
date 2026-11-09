import { createContext, useContext } from 'react'
import type { AuthUser } from '../../lib/data'

export interface AuthState {
  /** `undefined` while the stored session is still being read. */
  user: AuthUser | null | undefined
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
