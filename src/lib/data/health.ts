import { getSupabase } from '../supabase'

export type ConnectionStatus = { ok: true; serverTime: string } | { ok: false; message: string }

/**
 * Proves the app can reach the database by calling the `keepalive()` SQL
 * function (supabase/migrations). The weekly keep-alive workflow calls the same function.
 */
export async function checkConnection(): Promise<ConnectionStatus> {
  try {
    const { data, error } = await getSupabase().rpc('keepalive')
    if (error) return { ok: false, message: error.message }
    return { ok: true, serverTime: String(data) }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Unknown error' }
  }
}
