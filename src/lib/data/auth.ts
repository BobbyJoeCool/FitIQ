import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '../supabase'
import { DataError } from './errors'

/** The part of a Supabase session the app needs. Keeps Supabase types out of components. */
export interface AuthUser {
  id: string
  email: string
}

function toAuthUser(session: Session | null): AuthUser | null {
  if (!session) return null
  return { id: session.user.id, email: session.user.email ?? '' }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await getSupabase().auth.getSession()
  if (error) throw new DataError(error.message)
  return toAuthUser(data.session)
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })
  if (error) {
    // Supabase returns "Invalid login credentials" for both a wrong email and a wrong password.
    throw new DataError(
      error.message === 'Invalid login credentials'
        ? 'That email and password do not match an account.'
        : error.message,
      error.code,
    )
  }
  const user = toAuthUser(data.session)
  if (!user) throw new DataError('Sign-in did not return a session.')
  return user
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut()
  if (error) throw new DataError(error.message)
}

/** Calls `listener` whenever the signed-in user changes. Returns an unsubscribe function. */
export function onAuthChange(listener: (user: AuthUser | null) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    listener(toAuthUser(session))
  })
  return () => data.subscription.unsubscribe()
}
