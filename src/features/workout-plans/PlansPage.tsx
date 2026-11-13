import { Link, useLocation, useSearchParams } from 'react-router'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { StatusMessage } from '../../components/common/StatusMessage'
import { useAsync } from '../../hooks/useAsync'
import { returnState } from '../../hooks/useReturnTo'
import { listMyPlans, type Plan } from '../../lib/data'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { exerciseCount } from './format'
import styles from './plans.module.css'

export function PlansPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { state, reload } = useAsync(() => listMyPlans(userId), userId)
  const [params, setParams] = useSearchParams()
  const showArchived = params.get('archived') === '1'
  const location = useLocation()
  const fromPlans = returnState(location, 'Plans')

  const plans = state.status === 'ready' ? state.data : null
  const archivedCount = plans?.filter((p) => p.isArchived).length ?? 0
  const shown = plans?.filter((p) => showArchived || !p.isArchived) ?? []

  return (
    <section>
      <div className={styles.header}>
        <h1>Plans</h1>
        <div className={styles.headerActions}>
          <Link to="/plans/starters" state={fromPlans} className={controls.button}>
            Starter plans
          </Link>
          <Link to="/plans/import" state={fromPlans} className={controls.button}>
            Import a plan
          </Link>
          <Link to="/plans/new" state={fromPlans} className={controls.primary}>
            New plan
          </Link>
        </div>
      </div>

      {state.status === 'loading' && <LoadingScreen label="Loading plans…" />}

      {state.status === 'error' && (
        <StatusMessage
          tone="error"
          title="Couldn't load your plans"
          action={
            <button type="button" className={controls.button} onClick={reload}>
              Try again
            </button>
          }
        >
          {state.error}
        </StatusMessage>
      )}

      {plans && plans.length === 0 && (
        <StatusMessage
          title="No plans yet"
          action={
            <span className={styles.headerActions}>
              <Link to="/plans/new" state={fromPlans} className={controls.primary}>
                Create your first plan
              </Link>
              <Link to="/plans/starters" state={fromPlans} className={controls.button}>
                Use a starter plan
              </Link>
              <Link to="/plans/import" state={fromPlans} className={controls.button}>
                Import a plan
              </Link>
            </span>
          }
        >
          A plan is a routine you can reuse: pick exercises from the library and set target sets,
          reps, and rest for each one. Or start from a ready-made one, like a full-body stretch.
        </StatusMessage>
      )}

      {plans && plans.length > 0 && shown.length === 0 && (
        <StatusMessage title="No active plans">
          All your plans are archived. Show archived plans to restore one, or create a new plan.
        </StatusMessage>
      )}

      {shown.length > 0 && (
        <ul className={styles.list}>
          {shown.map((plan) => (
            <li key={plan.id}>
              <PlanCard plan={plan} linkState={fromPlans} />
            </li>
          ))}
        </ul>
      )}

      {archivedCount > 0 && (
        <div className={styles.footer}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) =>
                setParams(e.target.checked ? { archived: '1' } : {}, { replace: true })
              }
            />
            Show archived ({archivedCount})
          </label>
        </div>
      )}
    </section>
  )
}

function PlanCard({ plan, linkState }: { plan: Plan; linkState: unknown }) {
  return (
    <Link to={`/plans/${plan.id}`} state={linkState} className={styles.card}>
      <span className={styles.cardTitle}>{plan.name}</span>
      {plan.description && (
        <span className={`${styles.cardMeta} ${styles.clamp}`}>{plan.description}</span>
      )}
      <span className={styles.cardMeta}>{exerciseCount(plan.exerciseCount)}</span>
      {plan.isArchived && (
        <span className={styles.badges}>
          <span className={styles.badge}>Archived</span>
        </span>
      )}
    </Link>
  )
}
