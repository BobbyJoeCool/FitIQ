import { loadSoundSettings } from './soundSettings'

/**
 * Tones and spoken cues for the workout timers (FV-14). Tones are generated in
 * the browser (no audio files); speech uses the phone's built-in voice. Both do
 * nothing where the browser doesn't support them, so the timer works the same.
 */

type AudioContextCtor = typeof AudioContext

let context: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (context) return context
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  if (!Ctor) return null
  try {
    context = new Ctor()
  } catch {
    return null
  }
  return context
}

function speech(): SpeechSynthesis | null {
  return 'speechSynthesis' in window ? window.speechSynthesis : null
}

/**
 * Call from a tap (Start timer, Complete set). iPhone Safari only allows sound
 * after a user gesture; once unlocked here, later cues in the set can play.
 */
export function unlockAudio(): void {
  const settings = loadSoundSettings()
  try {
    if (settings.tones) {
      const ctx = audioContext()
      if (ctx && ctx.state === 'suspended') void ctx.resume()
    }
    if (settings.voice) {
      const synth = speech()
      if (synth && typeof SpeechSynthesisUtterance !== 'undefined' && !synth.speaking) {
        // A silent utterance inside the gesture unlocks speech on iOS.
        const u = new SpeechSynthesisUtterance(' ')
        u.volume = 0
        synth.speak(u)
      }
    }
  } catch {
    // No sound support: carry on silently.
  }
}

/** One soft countdown tone: a short sine with a gentle fade in and out. */
export function playTone(final = false): void {
  const settings = loadSoundSettings()
  if (!settings.tones || settings.volume <= 0) return
  const ctx = audioContext()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = final ? 880 : 660
    const peak = 0.25 * settings.volume
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.4)
  } catch {
    // Ignore: a missed tone isn't worth an error.
  }
}

/** Speak a short cue at a calm rate, replacing any cue still being spoken. */
export function speak(text: string): void {
  const settings = loadSoundSettings()
  if (!settings.voice || settings.volume <= 0) return
  const synth = speech()
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return
  try {
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95
    u.volume = settings.volume
    synth.speak(u)
  } catch {
    // Ignore.
  }
}
