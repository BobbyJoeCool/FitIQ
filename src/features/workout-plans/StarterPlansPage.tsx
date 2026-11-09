import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { BackLink } from '../../components/common/ReturnLink'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { addExercisesToPlan, createPlan, loadCatalog, type Exercise } from '../../lib/data'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { formatTargets } from './format'
import { fallbackName } from './planScreen'
import { STARTER_PLANS, type StarterPlan } from './starterPlans'
import styles from './plans.module.css'

/** Copy a ready-made routine into your own plans (/plans/starters). */
export function StarterPlansPage() {
  const { state, reload } = useAsync(() => loadCatalog(), 'catalog')

  return (
    <section>
      <BackLink fallback="/plans" fallbackLabel="Plans" />
      <h1>Starter plans</h1>
      <p className={styles.muted}>
        Adding one makes your own copy. You can change it afterwards like any plan.
      </p>
      {state.status === 'loading' && <LoadingScreen label="Loading starter plans…" />}
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
      {state.status === 'ready' && (
        <div className={styles.list}>
          {STARTER_PLANS.map((starter) => (
            <StarterCard
              key={starter.slug}
              starter={starter}
              catalog={new Map(state.data.map((e) => [e.id, e]))}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function StarterCard({
  starter,
  catalog,
}: {
  starter: StarterPlan
  catalog: Map<string, Exercise>
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Skip anything the pinned catalog no longer has rather than adding a broken row.
  const available = starter.exercises.filter((e) => catalog.has(e.id))

  async function add() {
    setSaving(true)
    setError(null)
    try {
      const plan = await createPlan({ name: starter.name, description: starter.description })
      await addExercisesToPlan(
        user?.id ?? '',
        plan.id,
        available.map((e) => ({ exercise: { source: 'catalog', id: e.id }, targets: e.targets })),
      )
      navigate(`/plans/${plan.id}`, { replace: true, state: location.state })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the plan.')
      setSaving(false)
    }
  }

  return (
    <article className={styles.starter} aria-labelledby={`starter-${starter.slug}`}>
      <h2 id={`starter-${starter.slug}`}>{starter.name}</h2>
      <p className={styles.cardMeta}>{starter.summary}</p>
      <p style={{ margin: 0 }}>{starter.description}</p>
      <ol className={styles.starterList}>
        {available.map((e) => (
          <li key={e.id}>
            {catalog.get(e.id)?.name ?? fallbackName({ source: 'catalog', id: e.id })}
            <span className={styles.cardMeta}> · {formatTargets(e.targets)}</span>
          </li>
        ))}
      </ol>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div>
        <button type="button" className={controls.primary} disabled={saving} onClick={add}>
          {saving ? 'Adding…' : 'Add to my plans'}
        </button>
      </div>
    </article>
  )
}
