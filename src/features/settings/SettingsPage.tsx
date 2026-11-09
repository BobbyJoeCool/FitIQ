import { useState } from 'react'
import { PagePlaceholder } from '../../components/common/PagePlaceholder'
import { useAuth } from '../auth/AuthContext'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const [error, setError] = useState<string | null>(null)

  async function handleSignOut() {
    setError(null)
    try {
      await signOut()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-out failed.')
    }
  }

  return (
    <PagePlaceholder title="Settings" phase="Phase 7, Cardio and polish">
      <p>Signed in as {user?.email}.</p>
      <button type="button" onClick={handleSignOut}>
        Sign out
      </button>
      {error && <p role="alert">{error}</p>}
    </PagePlaceholder>
  )
}
