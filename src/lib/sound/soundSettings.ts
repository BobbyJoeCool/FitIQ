/**
 * Sound settings for the workout timers (FV-14). Stored per device in local
 * storage, not per account: the right choice depends on the phone and where
 * you're working out. Everything falls back to the defaults when storage is
 * unavailable (private browsing, blocked site data).
 */
export interface SoundSettings {
  /** Spoken cues: "Hold", "Release", "Switch", "Done". */
  voice: boolean
  /** The soft 3, 2, 1 countdown before each change. */
  tones: boolean
  /** 0 to 1. */
  volume: number
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = { voice: true, tones: true, volume: 0.7 }

const KEY = 'fitiq.sound'

export function loadSoundSettings(): SoundSettings {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SOUND_SETTINGS }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SOUND_SETTINGS }
    const p = parsed as Partial<Record<keyof SoundSettings, unknown>>
    return {
      voice: typeof p.voice === 'boolean' ? p.voice : DEFAULT_SOUND_SETTINGS.voice,
      tones: typeof p.tones === 'boolean' ? p.tones : DEFAULT_SOUND_SETTINGS.tones,
      volume:
        typeof p.volume === 'number' && Number.isFinite(p.volume)
          ? Math.min(1, Math.max(0, p.volume))
          : DEFAULT_SOUND_SETTINGS.volume,
    }
  } catch {
    return { ...DEFAULT_SOUND_SETTINGS }
  }
}

export function saveSoundSettings(settings: SoundSettings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable: the setting lasts until the page reloads.
  }
}
