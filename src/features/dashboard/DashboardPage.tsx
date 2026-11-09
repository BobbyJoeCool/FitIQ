import { useEffect, useState } from 'react'
import { checkConnection, getMyProfile, type ConnectionStatus, type Profile } from '../../lib/data'
import { useAuth } from '../auth/AuthContext'

export function DashboardPage() {
  const { user } = useAuth()
  const [connection, setConnection] = useState<ConnectionStatus | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    let active = true
    checkConnection().then((status) => {
      if (active) setConnection(status)
    })
    if (user) {
      getMyProfile(user.id)
        .then((p) => {
          if (active) setProfile(p)
        })
        .catch(() => {
          if (active) setProfile(null)
        })
    }
    return () => {
      active = false
    }
  }, [user])

  const name = profile?.displayName || user?.email

  return (
    <section>
      <h1>Hi{name ? `, ${name}` : ''}</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Your dashboard arrives in Phase 6. For now, this page proves the app can reach its database.
      </p>
      <p data-testid="connection-status">
        Database:{' '}
        {connection === null
          ? 'checking…'
          : connection.ok
            ? 'connected'
            : `not reachable (${connection.message})`}
      </p>
      {profile && (
        <p>
          Units: {profile.weightUnit}, {profile.lengthUnit}
        </p>
      )}
    </section>
  )
}
