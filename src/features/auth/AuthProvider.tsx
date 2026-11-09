import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as data from '../../lib/data'
import { AuthContext, type AuthState } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState['user']>(undefined)

  useEffect(() => {
    let active = true
    data
      .getCurrentUser()
      .then((current) => {
        if (active) setUser(current)
      })
      .catch(() => {
        if (active) setUser(null)
      })
    const unsubscribe = data.onAuthChange((next) => {
      if (active) setUser(next)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await data.signIn(email, password))
  }, [])

  const signOut = useCallback(async () => {
    await data.signOut()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
