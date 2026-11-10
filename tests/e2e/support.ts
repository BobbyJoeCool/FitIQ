import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'

/** Local test accounts only. These passwords exist only in the local Docker stack. */
export const USERS = {
  a: { email: 'e2e-a@example.com', password: 'e2e-local-password-a' },
  b: { email: 'e2e-b@example.com', password: 'e2e-local-password-b' },
}

const catalog = readFileSync(new URL('./fixtures/catalog.json', import.meta.url), 'utf8')
// A 1x1 transparent PNG for exercise images.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

/** Serves a small slice of the pinned Free Exercise DB, so tests don't depend on jsDelivr. */
export async function mockCatalog(page: Page) {
  await page.route('https://cdn.jsdelivr.net/**/exercises.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: catalog }),
  )
  await page.route('https://cdn.jsdelivr.net/**/*.jpg', (route) =>
    route.fulfill({ contentType: 'image/png', body: PIXEL }),
  )
}

export async function signIn(page: Page, who: keyof typeof USERS, path = '/') {
  await mockCatalog(page)
  await page.goto(path)
  await page.getByLabel('Email').fill(USERS[who].email)
  await page.getByLabel('Password').fill(USERS[who].password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeHidden()
}

/** A suffix that keeps names unique across runs against the same local database. */
export const runId = Date.now().toString(36)
