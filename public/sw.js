/*
 * FitIQ service worker (step 7.3). Plain JavaScript, no build step.
 *
 * - App shell (index.html): network first, cached copy when offline, so the
 *   app opens without a connection and shows its offline banner.
 * - Built assets (/assets/*, hashed): cache first.
 * - Free Exercise DB on jsDelivr, pinned to a commit and immutable: cache first,
 *   so the catalog and images work offline once seen.
 * - Supabase and everything else: never cached. No workout data is stored here;
 *   offline logging is out of scope for v1 (plan.md section 10).
 */
const VERSION = 'v2'
const SHELL = `fitiq-shell-${VERSION}`
const ASSETS = `fitiq-assets-${VERSION}`
const CATALOG = 'fitiq-catalog-v1'
const KEEP = [SHELL, ASSETS, CATALOG]
const scope = self.registration.scope
const INDEX = new URL('./', scope).href
const SHELL_FILES = [INDEX, 'manifest.webmanifest', 'favicon.svg', 'icons/icon-192.png'].map(
  (path) => new URL(path, scope).href,
)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

/** Keeps a cache to its newest `max` entries (oldest first in keys()). */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)))
}

async function cacheFirst(request, cacheName, max) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
    void trim(cacheName, max)
  }
  return response
}

async function shellFirstFromNetwork(request) {
  try {
    const response = await fetch(request)
    // GitHub Pages serves deep links as 404.html (the same app). Refresh the
    // cached shell only from a real 200 page.
    if (response.ok) {
      const cache = await caches.open(SHELL)
      await cache.put(INDEX, response.clone())
    }
    return response
  } catch {
    return (await caches.match(INDEX)) ?? Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (
    url.hostname === 'cdn.jsdelivr.net' &&
    url.pathname.includes('/gh/yuhonas/free-exercise-db@')
  ) {
    event.respondWith(cacheFirst(request, CATALOG, 600))
    return
  }
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(shellFirstFromNetwork(request))
    return
  }
  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request, ASSETS, 120))
    return
  }
  if (SHELL_FILES.includes(url.href)) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)))
  }
})
