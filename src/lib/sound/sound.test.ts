import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { speak, unlockAudio } from './cues'
import { DEFAULT_SOUND_SETTINGS, loadSoundSettings, saveSoundSettings } from './soundSettings'

beforeEach(() => window.localStorage.clear())

describe('sound settings (FV-14)', () => {
  it('defaults to voice and tones on', () => {
    expect(loadSoundSettings()).toEqual(DEFAULT_SOUND_SETTINGS)
  })

  it('saves and loads, clamping the volume and ignoring bad values', () => {
    saveSoundSettings({ voice: false, tones: true, volume: 0.3 })
    expect(loadSoundSettings()).toEqual({ voice: false, tones: true, volume: 0.3 })
    window.localStorage.setItem('fitiq.sound', JSON.stringify({ voice: 'yes', volume: 5 }))
    expect(loadSoundSettings()).toEqual({ voice: true, tones: true, volume: 1 })
    window.localStorage.setItem('fitiq.sound', 'not json')
    expect(loadSoundSettings()).toEqual(DEFAULT_SOUND_SETTINGS)
  })

  it('falls back to the defaults when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadSoundSettings()).toEqual(DEFAULT_SOUND_SETTINGS)
    spy.mockRestore()
  })
})

describe('speak (FV-14)', () => {
  const spoken: { text: string; volume: number }[] = []
  class Utterance {
    text: string
    volume = 1
    rate = 1
    constructor(text: string) {
      this.text = text
    }
  }

  beforeEach(() => {
    spoken.length = 0
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speaking: false,
        cancel: vi.fn(),
        speak: (u: Utterance) => spoken.push({ text: u.text, volume: u.volume }),
      },
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(window, 'speechSynthesis')
  })

  it('speaks at the saved volume', () => {
    saveSoundSettings({ voice: true, tones: false, volume: 0.5 })
    speak('Switch')
    expect(spoken).toEqual([{ text: 'Switch', volume: 0.5 }])
  })

  it('stays quiet when the voice is off', () => {
    saveSoundSettings({ voice: false, tones: true, volume: 0.5 })
    speak('Switch')
    unlockAudio()
    expect(spoken).toEqual([])
  })

  it('does nothing where speech is unsupported', () => {
    Reflect.deleteProperty(window, 'speechSynthesis')
    expect(() => {
      speak('Done')
      unlockAudio()
    }).not.toThrow()
  })
})
