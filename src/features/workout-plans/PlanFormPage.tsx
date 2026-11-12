import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { LoadingScreen } from '../../components/common/LoadingScreen'
import { ReturnLink } from '../../components/common/ReturnLink'
import { StatusMessage } from '../../components/common/StatusMessage'
import { Field } from '../../components/forms/Field'
import { useAsync } from '../../hooks/useAsync'
import { useReturnTo } from '../../hooks/useReturnTo'
import { createPlan, getMyPlan, updatePlan, type Plan } from '../../lib/data'
import { LIMITS, validatePlan, type PlanErrors, type PlanForm } from '../../lib/validation'
import controls from '../../styles/controls.module.css'
import { useAuth } from '../auth/AuthContext'
import { useProfile } from '../profile/ProfileContext'
import { formatRest } from './format'
import styles from './plans.module.css'

/** New plan (/plans/new) and edit a plan's name and description (/plans/:id/edit). */
export function PlanFormPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { state } = useAsync(
    () => (id ? getMyPlan(userId, id) : Promise.resolve(null)),
    `${userId}:${id ?? 'new'}`,
  )

  if (id && state.status === 'loading') return <LoadingScreen />
  if (id && state.status === 'error') {
    return (
      <StatusMessage tone="error" title="Couldn't load this plan">
        {state.error}
      </StatusMessage>
    )
  }
  if (id && state.status === 'ready' && !state.data) {
    return (
      <StatusMessage title="Plan not found">
        <Link to="/plans">Back to your plans</Link>
      </StatusMessage>
    )
  }
  const existing = state.status === 'ready' ? state.data : null
  return <PlanEditor key={existing?.id ?? 'new'} userId={userId} existing={existing} />
}

function PlanEditor({ userId, existing }: { userId: string; existing: Plan | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { leave } = useReturnTo()
  const [form, setForm] = useState<PlanForm>({
    name: existing?.name ?? '',
    description: existing?.description ?? '',
    defaultRest: existing?.defaultRestSeconds?.toString() ?? '',
  })
  const { profile } = useProfile()
  const settingsRest = profile?.defaultRestSeconds ?? null
  const [errors, setErrors] = useState<PlanErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    document.title = existing ? `Edit ${existing.name} · FitIQ` : 'New plan · FitIQ'
    return () => {
      document.title = 'FitIQ'
    }
  }, [existing])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError(null)
    const result = validatePlan(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      if (existing) {
        await updatePlan(userId, existing.id, result.value)
        leave(`/plans/${existing.id}`)
      } else {
        const plan = await createPlan(result.value)
        // Straight into the builder, replacing this form, so Back skips it.
        navigate(`/plans/${plan.id}`, { replace: true, state: location.state })
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the plan.')
      setSaving(false)
    }
  }

  return (
    <section>
      <h1>{existing ? 'Edit plan' : 'New plan'}</h1>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field label="Name" hint="For example: Push day, or Monday full body." error={errors.name}>
          <input
            className={controls.input}
            value={form.name}
            maxLength={LIMITS.planNameMax}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Description (optional)" error={errors.description}>
          <textarea
            className={controls.input}
            rows={3}
            value={form.description}
            maxLength={LIMITS.planDescriptionMax}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>

        <Field
          label="Default rest for this plan, in seconds (optional)"
          hint={`Exercises that follow the default use this. Leave blank to use your Settings default (${
            settingsRest === null ? 'off' : formatRest(settingsRest)
          }).`}
          error={errors.defaultRest}
        >
          <input
            className={controls.input}
            inputMode="numeric"
            placeholder="90"
            value={form.defaultRest}
            onChange={(e) => setForm({ ...form, defaultRest: e.target.value })}
          />
        </Field>

        {saveError && (
          <p className={controls.error} role="alert">
            {saveError}
          </p>
        )}

        <div className={styles.formActions}>
          <button type="submit" className={controls.primary} disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Create plan'}
          </button>
          <ReturnLink
            fallback={existing ? `/plans/${existing.id}` : '/plans'}
            replace
            className={controls.button}
          >
            Cancel
          </ReturnLink>
        </div>
      </form>
    </section>
  )
}
