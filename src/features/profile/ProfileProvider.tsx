import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getMyProfile, type Profile } from '../../lib/data'
import { useAuth } from '../auth/AuthContext'
import { ProfileContext } from './ProfileContext'

/** Loads the signed-in user's profile once, so every screen knows their units. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null } | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    Promise.resolve()
      .then(() => getMyProfile(user.id))
      .then((profile) => active && setLoaded({ userId: user.id, profile: profile ?? null }))
      .catch(() => active && setLoaded({ userId: user.id, profile: null }))
    return () => {
      active = false
    }
  }, [user])

  const profile = loaded && loaded.userId === user?.id ? loaded.profile : null
  const value = useMemo(
    () => ({
      profile,
      weightUnit: profile?.weightUnit ?? 'lb',
      lengthUnit: profile?.lengthUnit ?? 'in',
      setProfile: (next: Profile) => setLoaded({ userId: next.id, profile: next }),
    }),
    [profile],
  )
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}
