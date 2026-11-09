import { describe, expect, it } from 'vitest'
import { isSecretKey, readSupabaseConfig } from './supabase'

function fakeJwt(payload: object) {
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`
}

describe('readSupabaseConfig', () => {
  it('accepts a URL and a publishable key', () => {
    expect(
      readSupabaseConfig({
        VITE_SUPABASE_URL: 'https://abc.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123',
      }),
    ).toEqual({ ok: true, url: 'https://abc.supabase.co', publishableKey: 'sb_publishable_123' })
  })

  it('names every missing variable', () => {
    const config = readSupabaseConfig({})
    expect(config.ok).toBe(false)
    if (!config.ok) {
      expect(config.problems).toEqual([
        'VITE_SUPABASE_URL is not set.',
        'VITE_SUPABASE_PUBLISHABLE_KEY is not set.',
      ])
    }
  })

  it('rejects a malformed URL', () => {
    const config = readSupabaseConfig({
      VITE_SUPABASE_URL: 'abc.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123',
    })
    expect(config.ok).toBe(false)
  })

  it('refuses a secret key in the frontend', () => {
    const config = readSupabaseConfig({
      VITE_SUPABASE_URL: 'https://abc.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc',
    })
    expect(config.ok).toBe(false)
    if (!config.ok) expect(config.problems[0]).toMatch(/secret/)
  })
})

describe('isSecretKey', () => {
  it('flags new-style secret keys and legacy service_role JWTs', () => {
    expect(isSecretKey('sb_secret_abc')).toBe(true)
    expect(isSecretKey(fakeJwt({ role: 'service_role' }))).toBe(true)
  })

  it('allows publishable keys and legacy anon JWTs', () => {
    expect(isSecretKey('sb_publishable_abc')).toBe(false)
    expect(isSecretKey(fakeJwt({ role: 'anon' }))).toBe(false)
  })
})
