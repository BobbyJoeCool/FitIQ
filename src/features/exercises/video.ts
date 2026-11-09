/**
 * Turns a video link into an embeddable URL where we know how (YouTube),
 * using the privacy-enhanced youtube-nocookie domain. Anything else is shown
 * as a plain link only.
 */
export function videoEmbedUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  const host = parsed.hostname.replace(/^(www\.|m\.)/, '')
  let id: string | null = null
  if (host === 'youtu.be') {
    id = parsed.pathname.slice(1).split('/')[0] || null
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') id = parsed.searchParams.get('v')
    else {
      const match = parsed.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)
      id = match?.[1] ?? null
    }
  }
  if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null
  return `https://www.youtube-nocookie.com/embed/${id}`
}

/** "youtube.com" from a URL, for "Open on youtube.com" when no source name is given. */
export function videoHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'the source site'
  }
}
