import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { requestPasswordReset, updatePassword, verifyEmailLink } from '../../lib/data'
import { useAuth } from './AuthContext'
import styles from './SignInPage.module.css'

/** Matches minimum_password_length in supabase/config.toml and the hosted Auth settings. */
const MIN_PASSWORD_LENGTH = 10

function AuthCard({ lede, children }: { lede: string; children: ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.brand}>FitIQ</h1>
        <p className={styles.lede}>{lede}</p>
        {children}
      </div>
    </main>
  )
}

/** /forgot-password: email a reset link. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the email. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard lede="Reset your password.">
      {sent ? (
        <p role="status">
          If that address has a FitIQ account, a reset link is on its way. It works once and expires
          in an hour.
        </p>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            Email
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button className={styles.submit} type="submit" disabled={submitting || !email.trim()}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className={styles.note}>
        <Link to="/sign-in">Back to sign in</Link>
      </p>
    </AuthCard>
  )
}

/** /auth/confirm?token_hash=...&type=invite|recovery: the link in invite and reset emails. */
export function ConfirmEmailLinkPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)
  const tokenHash = params.get('token_hash')
  const type = params.get('type')
  const valid = Boolean(tokenHash) && (type === 'invite' || type === 'recovery')

  useEffect(() => {
    // A token works once, so never verify twice (React runs effects twice in development).
    if (!valid || started.current) return
    started.current = true
    verifyEmailLink(tokenHash!, type as 'invite' | 'recovery')
      .then(() => navigate('/set-password', { replace: true, state: { reason: type } }))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'This link did not work.'),
      )
  }, [valid, tokenHash, type, navigate])

  const problem = valid ? error : 'This link is incomplete. Open it straight from the email.'
  return (
    <AuthCard lede={problem ? "That link didn't work." : 'Checking your link…'}>
      {problem ? (
        <>
          <p className={styles.error} role="alert">
            {problem}
          </p>
          <p className={styles.note}>
            <Link to="/forgot-password">Get a new reset link</Link> ·{' '}
            <Link to="/sign-in">Sign in</Link>
          </p>
        </>
      ) : (
        <p role="status">One moment.</p>
      )}
    </AuthCard>
  )
}

/** /set-password (signed in): after an invite or reset link, or from Settings. */
export function SetPasswordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError("The two passwords don't match.")
      return
    }
    setSubmitting(true)
    try {
      await updatePassword(password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set the password.')
      setSubmitting(false)
    }
  }

  return (
    <AuthCard lede={`Choose a password for ${user?.email ?? 'your account'}.`}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.field}>
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <p className={styles.note} style={{ margin: 0 }}>
          At least {MIN_PASSWORD_LENGTH} characters. A password manager makes this easy.
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button className={styles.submit} type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </AuthCard>
  )
}
