import { execSync } from 'node:child_process'
import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests (step 8.1) against the LOCAL Supabase stack only, built
 * from the migrations. No real data: the suite creates its own test users.
 * Start the stack first: `npm run db:start`.
 */
function localStack(): Record<string, string> {
  let out: string
  try {
    out = execSync('npx supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    throw new Error('The local Supabase stack is not running. Start it with `npm run db:start`.')
  }
  return Object.fromEntries(
    out
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  )
}

const stack = localStack()
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(stack.API_URL ?? '')) {
  throw new Error('E2E tests only run against a local stack.')
}
process.env.E2E_API_URL = stack.API_URL
process.env.E2E_PUBLISHABLE_KEY = stack.PUBLISHABLE_KEY ?? stack.ANON_KEY
// Local-only admin key, used by global setup to create the test users.
process.env.E2E_SECRET_KEY = stack.SECRET_KEY ?? stack.SERVICE_ROLE_KEY

const PORT = 4174

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Pixel 7'],
    // Let page.route() see every request (the service worker would hide them).
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: process.env.E2E_API_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.E2E_PUBLISHABLE_KEY,
      BASE_PATH: '/',
    },
  },
})
