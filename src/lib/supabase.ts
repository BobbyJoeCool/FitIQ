import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client setup. Only `src/lib/data/` may import this file:
 * components and features go through the data layer (plan.md section 5).
 */

export type SupabaseConfig =
  { ok: true; url: string; publishableKey: string } | { ok: false; problems: string[] }

type EnvLike = Partial<Record<'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY', string>>

/** True when the key is a secret/service-role key that must never ship to a browser. */
export function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  const parts = key.split('.')
  if (parts.length !== 3) return false
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      role?: string
    }
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

export function readSupabaseConfig(env: EnvLike = import.meta.env): SupabaseConfig {
  const url = env.VITE_SUPABASE_URL?.trim() ?? ''
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
  const problems: string[] = []

  if (!url) {
    problems.push('VITE_SUPABASE_URL is not set.')
  } else if (!/^https?:\/\/\S+$/.test(url)) {
    problems.push('VITE_SUPABASE_URL is not a valid http(s) URL.')
  }

  if (!publishableKey) {
    problems.push('VITE_SUPABASE_PUBLISHABLE_KEY is not set.')
  } else if (isSecretKey(publishableKey)) {
    problems.push(
      'VITE_SUPABASE_PUBLISHABLE_KEY holds a secret (service-role) key. Use the publishable key, and rotate the secret key if it was ever deployed.',
    )
  }

  return problems.length ? { ok: false, problems } : { ok: true, url, publishableKey }
}

let client: SupabaseClient | null = null

/** The shared client. Throws if the environment is not configured. */
export function getSupabase(): SupabaseClient {
  if (client) return client
  const config = readSupabaseConfig()
  if (!config.ok) {
    throw new Error(`Supabase is not configured: ${config.problems.join(' ')}`)
  }
  client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return client
}
