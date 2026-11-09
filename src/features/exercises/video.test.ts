import { describe, expect, it } from 'vitest'
import { videoEmbedUrl, videoHost } from './video'

describe('videoEmbedUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ])('embeds %s via youtube-nocookie', (url) => {
    expect(videoEmbedUrl(url)).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it.each([
    'https://vimeo.com/12345',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/watch?v=<script>',
    'javascript:alert(1)',
    'not a url',
  ])('does not embed %s', (url) => {
    expect(videoEmbedUrl(url)).toBeNull()
  })
})

describe('videoHost', () => {
  it('names the site for the plain link', () => {
    expect(videoHost('https://www.vimeo.com/1')).toBe('vimeo.com')
    expect(videoHost('nope')).toBe('the source site')
  })
})
