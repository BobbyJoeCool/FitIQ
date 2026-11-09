import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from './AuthContext'
import styles from './SignInPage.module.css'

export function SignInPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={from} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.brand}>FitIQ</h1>
        <p className={styles.lede}>Sign in to your account.</p>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            Email
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button
            className={styles.submit}
            type="submit"
            disabled={submitting || !email || !password}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className={styles.note}>
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <p className={styles.note}>FitIQ is invite-only. Ask the household owner for an invite.</p>
      </div>
    </main>
  )
}
