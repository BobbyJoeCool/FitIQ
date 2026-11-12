import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Field } from '../../components/forms/Field'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import {
  listAllCardio,
  listAllFinishedSessions,
  listAllMeasurements,
  listAllWeighIns,
  setDeletionRequested,
  updateMyProfile,
} from '../../lib/data'
import { playTone, speak, unlockAudio } from '../../lib/sound/cues'
import {
  loadSoundSettings,
  saveSoundSettings,
  type SoundSettings,
} from '../../lib/sound/soundSettings'
import type { LengthUnit, WeightUnit } from '../../lib/units'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import {
  cardioCsv,
  downloadFile,
  exportFilename,
  measurementsCsv,
  weighInsCsv,
  workoutsCsv,
} from './exportCsv'
import styles from './settings.module.css'

/** /settings: profile and units (7.2), install (7.3), privacy, and sign out. */
/** The shared public demo account (step 9.1): anyone can sign in to it. */
const isDemoAccount = (email: string | undefined) => /^demo@/i.test(email ?? '')

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const demo = isDemoAccount(user?.email)
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
        {demo && (
          <p className={styles.muted}>
            This is the shared demo account. Anything you change here is reset every week.
          </p>
        )}
        <div className={styles.actions}>
          {!demo && (
            <Link to="/set-password" className={controls.button}>
              Change password
            </Link>
          )}
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

      <SoundPanel />

      <ExportPanel />

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

      {!demo && <DeletePanel />}
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

/** Timer sound cues (FV-14), saved on this device only. */
function SoundPanel() {
  const [settings, setSettings] = useState<SoundSettings>(loadSoundSettings)
  const update = (patch: Partial<SoundSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSoundSettings(next)
  }
  const volumePercent = Math.round(settings.volume * 100)

  return (
    <div className={styles.panel} role="group" aria-labelledby="sound-heading">
      <h2 id="sound-heading">Sound</h2>
      <p className={styles.muted}>
        Cues for the hold and rest timers, so you don't have to watch the screen. Saved on this
        device only. Phones that vibrate still do.
      </p>
      <label className={styles.choice}>
        <input
          type="checkbox"
          checked={settings.voice}
          onChange={(e) => update({ voice: e.target.checked })}
        />
        Voice cues ("Hold", "Release", "Switch", "Done")
      </label>
      <label className={styles.choice}>
        <input
          type="checkbox"
          checked={settings.tones}
          onChange={(e) => update({ tones: e.target.checked })}
        />
        Soft 3, 2, 1 countdown tones
      </label>
      <Field label="Volume" hint={`${volumePercent}%`}>
        <input
          type="range"
          min={0}
          max={100}
          step={10}
          value={volumePercent}
          onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
        />
      </Field>
      <div>
        <button
          type="button"
          className={controls.button}
          disabled={!settings.voice && !settings.tones}
          onClick={() => {
            unlockAudio()
            playTone()
            speak('Hold')
          }}
        >
          Test sound
        </button>
      </div>
    </div>
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

const EXPORTS = [
  {
    kind: 'workouts',
    label: 'Workouts and sets',
    load: listAllFinishedSessions,
    build: workoutsCsv,
  },
  { kind: 'weigh-ins', label: 'Weigh-ins', load: listAllWeighIns, build: weighInsCsv },
  {
    kind: 'measurements',
    label: 'Measurements',
    load: listAllMeasurements,
    build: measurementsCsv,
  },
  { kind: 'cardio', label: 'Cardio', load: listAllCardio, build: cardioCsv },
] as const

/** Download your own data as CSV (step 8.2). */
function ExportPanel() {
  const { user } = useAuth()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function download(item: (typeof EXPORTS)[number]) {
    setBusy(item.kind)
    setError(null)
    try {
      // Each loader returns the matching row type for its builder.
      const rows = await (item.load as (id: string) => Promise<unknown[]>)(user?.id ?? '')
      downloadFile(exportFilename(item.kind), (item.build as (r: unknown[]) => string)(rows))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export your data.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={styles.panel}>
      <h2>Download your data</h2>
      <p className={styles.muted}>
        CSV files that open in any spreadsheet. Only your own data, with the unit on every row.
      </p>
      <div className={styles.actions}>
        {EXPORTS.map((item) => (
          <button
            key={item.kind}
            type="button"
            className={controls.button}
            disabled={busy !== null}
            onClick={() => download(item)}
          >
            {busy === item.kind ? 'Preparing…' : item.label}
          </button>
        ))}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** Ask the owner to delete this account (step 8.3). Nothing is deleted here. */
function DeletePanel() {
  const { user } = useAuth()
  const { profile, setProfile } = useProfile()
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = profile?.deletionRequestedAt

  async function toggle(requested: boolean) {
    setBusy(true)
    setError(null)
    try {
      setProfile(await setDeletionRequested(user?.id ?? '', requested))
      setConfirmText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your request.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.panel}>
      <h2>Delete my account</h2>
      {pending ? (
        <>
          <p role="status">
            You asked for your account to be deleted on {new Date(pending).toLocaleDateString()}.
            The household owner will delete it and let you know. Until then, everything still works
            and you can change your mind.
          </p>
          <div>
            <button
              type="button"
              className={controls.button}
              disabled={busy}
              onClick={() => toggle(false)}
            >
              Cancel the request
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            FitIQ accounts are managed by the household owner, so this sends them a request. When
            they delete your account,{' '}
            <strong>everything you've logged is permanently removed</strong>: workouts, sets, plans,
            custom exercises, weigh-ins, measurements, and cardio. It can't be undone, so download
            your data first if you want a copy.
          </p>
          <Field label="Type DELETE to confirm">
            <input
              className={controls.input}
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </Field>
          <div>
            <button
              type="button"
              className={`${controls.button} ${styles.danger}`}
              disabled={busy || confirmText.trim() !== 'DELETE'}
              onClick={() => toggle(true)}
            >
              Request account deletion
            </button>
          </div>
        </>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
