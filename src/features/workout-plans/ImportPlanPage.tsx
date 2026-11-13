import { useState, type ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { BackLink } from '../../components/common/ReturnLink'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import {
  addExercisesToPlan,
  createCustomExercise,
  createPlan,
  loadExerciseLibrary,
  type Exercise,
  type ExerciseRef,
} from '../../lib/data'
import controls from '../../styles/controls.module.css'
import { effectiveDefaultRest } from '../../lib/rest'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import { formatPlanTargets } from './format'
import { parsePlanFile, PLAN_FILE_MAX_BYTES, type ImportItem, type ImportPreview } from './planFile'
import styles from './plans.module.css'

const FORMAT_DOC = 'https://github.com/BobbyJoeCool/FitIQ/blob/main/docs/plan-format.md'

const NOTE: Record<ImportItem['kind'], string | null> = {
  catalog: null,
  'custom-existing': 'your custom exercise',
  'custom-new': 'new custom exercise',
  unknown: 'not in the library: skipped',
}

/** /plans/import: read a plan file (FV-15), preview it, and add it as a new plan. */
export function ImportPlanPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { state, reload } = useAsync(() => loadExerciseLibrary(userId), userId)

  return (
    <section>
      <BackLink fallback="/plans" fallbackLabel="Plans" />
      <h1>Import a plan</h1>
      <p className={styles.muted}>
        Open a <code>.fitiq-plan.json</code> file someone shared with you, or one you wrote. It
        becomes a new plan of your own; nothing you already have changes.{' '}
        <a href={FORMAT_DOC} target="_blank" rel="noreferrer">
          How plan files work
        </a>
      </p>
      {state.status === 'loading' && <LoadingScreen label="Loading the exercise library…" />}
      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load the exercise library"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          {state.error}
        </StatusMessage>
      )}
      {state.status === 'ready' && <Importer userId={userId} library={state.data} />}
    </section>
  )
}

function Importer({ userId, library }: { userId: string; library: Exercise[] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const online = useOnlineStatus()
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { profile } = useProfile()
  const defaultRest = effectiveDefaultRest(
    preview?.plan.defaultRestSeconds,
    profile?.defaultRestSeconds,
  )

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setPreview(null)
    setError(null)
    if (!file) return
    if (file.size > PLAN_FILE_MAX_BYTES) {
      setError('That file is too big for a plan (over 200 KB).')
      return
    }
    const result = parsePlanFile(await file.text(), library)
    if (result.ok) setPreview(result.preview)
    else setError(result.error)
  }

  async function handleImport() {
    if (!preview) return
    setSaving(true)
    setError(null)
    try {
      // New custom exercises first, each once even if the plan uses it twice.
      const created = new Map<string, ExerciseRef>()
      for (const item of preview.items) {
        if (item.kind === 'custom-new' && !created.has(item.customKey)) {
          const exercise = await createCustomExercise(item.custom)
          created.set(item.customKey, { source: 'custom', id: exercise.id })
        }
      }
      const plan = await createPlan(preview.plan)
      await addExercisesToPlan(
        userId,
        plan.id,
        preview.items.flatMap((item) => {
          if (item.kind === 'unknown') return []
          const ref = item.kind === 'custom-new' ? created.get(item.customKey) : item.ref
          return ref ? [{ exercise: ref, targets: item.targets }] : []
        }),
      )
      navigate(`/plans/${plan.id}`, { replace: true, state: location.state })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import the plan.')
      setSaving(false)
    }
  }

  const skipped = preview?.items.filter((i) => i.kind === 'unknown').length ?? 0
  const newCustom = new Set(
    preview?.items.flatMap((i) => (i.kind === 'custom-new' ? [i.customKey] : [])),
  ).size

  return (
    <div className={styles.form}>
      <div className={controls.field}>
        <label htmlFor="plan-file">Plan file</label>
        <input
          id="plan-file"
          type="file"
          accept=".json,application/json"
          onChange={(e) => void handleFile(e)}
        />
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {preview && (
        <article className={styles.starter} aria-labelledby="import-name">
          <h2 id="import-name">{preview.plan.name}</h2>
          {preview.plan.description && <p style={{ margin: 0 }}>{preview.plan.description}</p>}
          <ol className={styles.starterList} aria-label="Exercises in the file">
            {preview.items.map((item, i) => (
              <li key={i}>
                {item.name}
                {item.kind !== 'unknown' && formatPlanTargets(item.targets, defaultRest) && (
                  <span className={styles.cardMeta}>
                    {' '}
                    · {formatPlanTargets(item.targets, defaultRest)}
                  </span>
                )}
                {NOTE[item.kind] && <span className={styles.cardMeta}> ({NOTE[item.kind]})</span>}
              </li>
            ))}
          </ol>
          {(skipped > 0 || newCustom > 0) && (
            <p className={styles.muted} style={{ margin: 0 }}>
              {[
                skipped > 0 &&
                  `${skipped} exercise${skipped === 1 ? " isn't" : "s aren't"} in the library and will be skipped.`,
                newCustom > 0 &&
                  `${newCustom} custom exercise${newCustom === 1 ? '' : 's'} will be added to your library.`,
              ]
                .filter(Boolean)
                .join(' ')}
            </p>
          )}
          <div className={styles.headerActions}>
            <button
              type="button"
              className={controls.primary}
              disabled={saving || !online}
              onClick={() => void handleImport()}
            >
              {saving ? 'Importing…' : 'Import plan'}
            </button>
          </div>
          {!online && <p className={styles.muted}>You're offline. Importing needs a connection.</p>}
        </article>
      )}
    </div>
  )
}
