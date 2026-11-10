import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Field } from '../../components/forms/Field'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { updateMyProfile } from '../../lib/data'
import type { LengthUnit, WeightUnit } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import styles from './settings.module.css'

/** /settings: profile and units (7.2), install (7.3), privacy, and sign out. */
export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
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
    <section>
      <h1>Settings</h1>
      {profile ? (
        <ProfileForm key={profile.id} />
      ) : (
        <div className={styles.panel}>
          <p className={styles.muted}>Loading your profile…</p>
        </div>
      )}

      <div className={styles.panel}>
        <h2>Account</h2>
        <p>Signed in as {user?.email}.</p>
        <div className={styles.actions}>
          <Link to="/set-password" className={controls.button}>
            Change password
          </Link>
          <button type="button" className={controls.button} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>

      <InstallPanel />

      <div className={styles.panel}>
        <h2>Privacy</h2>
        <ul className={styles.list}>
          <li>
            Everything you log is private to your account. Other people in the household can't see
            it, and you can't see theirs.
          </li>
          <li>
            The household owner manages accounts (adding, resetting, removing) but doesn't use your
            data in the app.
          </li>
          <li>
            Your data is stored in a Supabase Postgres database. Exercise pictures load from
            jsDelivr; videos load from their site only when you tap play.
          </li>
          <li>FitIQ has no ads, no analytics, and no tracking.</li>
        </ul>
      </div>
    </section>
  )
}

function ProfileForm() {
  const { user } = useAuth()
  const { profile, setProfile } = useProfile()
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(profile?.weightUnit ?? 'lb')
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>(profile?.lengthUnit ?? 'in')
  const [nameError, setNameError] = useState<string | undefined>()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(false)
    setSaveError(null)
    const name = displayName.trim()
    if (name.length > 50) {
      setNameError('Keep it under 51 characters.')
      return
    }
    setNameError(undefined)
    setSaving(true)
    try {
      const next = await updateMyProfile(user?.id ?? '', {
        displayName: name || null,
        weightUnit,
        lengthUnit,
      })
      setProfile(next)
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save your settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className={styles.panel}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Profile and units"
    >
      <h2>Profile and units</h2>
      <Field
        label="Display name (optional)"
        hint="Shown in your greeting. Only you see it."
        error={nameError}
      >
        <input
          className={controls.input}
          maxLength={50}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Field>
      <fieldset className={styles.choices}>
        <legend>Weight</legend>
        {(['lb', 'kg'] as const).map((u) => (
          <label key={u} className={styles.choice}>
            <input
              type="radio"
              name="weight-unit"
              checked={weightUnit === u}
              onChange={() => setWeightUnit(u)}
            />
            {u === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.choices}>
        <legend>Length and distance</legend>
        {(['in', 'cm'] as const).map((u) => (
          <label key={u} className={styles.choice}>
            <input
              type="radio"
              name="length-unit"
              checked={lengthUnit === u}
              onChange={() => setLengthUnit(u)}
            />
            {u === 'in' ? 'Inches and miles' : 'Centimetres and kilometres'}
          </label>
        ))}
      </fieldset>
      <p className={styles.muted}>
        Changing units changes how everything is shown and the default for new entries. Nothing
        you've already logged is rewritten: each entry keeps the unit it was saved in.
      </p>
      {saveError && (
        <p className={styles.error} role="alert">
          {saveError}
        </p>
      )}
      {saved && <p role="status">Saved.</p>}
      <div>
        <button type="submit" className={controls.primary} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  )
}

function InstallPanel() {
  const { installed, install } = useInstallPrompt()
  return (
    <div className={styles.panel}>
      <h2>Install FitIQ</h2>
      {installed ? (
        <p>FitIQ is installed on this device.</p>
      ) : (
        <>
          <p>Add FitIQ to your home screen to open it like an app, full screen.</p>
          {install && (
            <div>
              <button type="button" className={controls.primary} onClick={() => void install()}>
                Install FitIQ
              </button>
            </div>
          )}
          <ul className={styles.list}>
            <li>
              <strong>iPhone or iPad (Safari):</strong> tap Share, then Add to Home Screen.
            </li>
            <li>
              <strong>Android (Chrome):</strong> tap the menu (⋮), then Install app or Add to Home
              screen.
            </li>
          </ul>
        </>
      )}
    </div>
  )
}
