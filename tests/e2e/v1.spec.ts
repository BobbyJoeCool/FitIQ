import { expect, test } from '@playwright/test'
import { runId, signIn } from './support'

/**
 * The plan.md section 13 E2E flows: sign in, create a plan, search and add an
 * exercise, start a workout, log sets, complete it, see it in history, log a
 * weigh-in, and check a second user can't see any of it.
 */
test.describe.configure({ mode: 'serial' })

const planName = `E2E Push ${runId}`
// Unique per run, so leftovers from earlier runs never match. Never ends in .0.
const n = Date.now() % 600
const weight = `${150 + Math.floor(n / 9)}.${(n % 9) + 1}`
let planUrl = ''
let sessionUrl = ''

test('user A plans, logs, and finishes a workout, then logs a weigh-in', async ({ page }) => {
  await signIn(page, 'a', '/plans')

  // Create a plan
  await page.getByRole('link', { name: 'New plan' }).click()
  await page.getByLabel('Name', { exact: true }).fill(planName)
  await page.getByRole('button', { name: 'Create plan' }).click()
  await expect(page.getByRole('heading', { name: planName })).toBeVisible()
  planUrl = new URL(page.url()).pathname

  // Search the library and add an exercise
  await page.getByRole('link', { name: 'Add exercises' }).click()
  await page.getByRole('searchbox').fill('bench')
  await page.getByRole('button', { name: 'Add: Dumbbell Bench Press' }).click()
  await expect(page.getByText('Added', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: /^Done/ }).click()

  // Targets: 2 × 10
  await page.getByRole('button', { name: 'Edit targets for Dumbbell Bench Press' }).click()
  await page.getByLabel('Sets').fill('2')
  await page.getByLabel('Reps').fill('10')
  await page.getByRole('button', { name: 'Save targets' }).click()
  await expect(page.getByText('2 × 10')).toBeVisible()

  // Start a workout and log both sets
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page).toHaveURL(/\/workout$/)
  await expect(page.getByRole('heading', { name: 'Dumbbell Bench Press' })).toBeVisible()
  const entry = page.getByRole('form', { name: 'Set 1 of 2' })
  await expect(entry.getByLabel('Reps', { exact: true })).toHaveValue('10')
  await entry.getByLabel('Weight (lb)', { exact: true }).fill('50')
  await entry.getByRole('button', { name: 'Complete set' }).click()
  await page
    .getByRole('form', { name: 'Set 2 of 2' })
    .getByRole('button', { name: 'Complete set' })
    .click()
  await expect(page.getByText('All 2 target sets done.')).toBeVisible()

  // A reload mid-workout loses nothing
  await page.reload()
  await expect(page.getByRole('list', { name: 'Sets done' }).getByText('10 × 50 lb')).toHaveCount(2)

  // Finish and see it in history
  await page.getByRole('button', { name: 'Finish workout' }).click()
  await page.getByRole('button', { name: 'Finish workout' }).click()
  await expect(page).toHaveURL(/\/workout\/history\/[0-9a-f-]+$/)
  sessionUrl = new URL(page.url()).pathname
  await expect(page.getByText('10 × 50 lb')).toHaveCount(2)
  await page.goto('/workout/history')
  await expect(page.getByRole('link', { name: new RegExp(planName) })).toBeVisible()

  // Log a weigh-in
  await page.goto('/progress/weight')
  const form = page.getByRole('form', { name: 'Log a weigh-in' })
  await form.getByLabel('Weight', { exact: true }).fill(weight)
  await form.getByRole('button', { name: 'Save weigh-in' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: `${weight} lb` })).toBeVisible()
})

test("user B can't see user A's plan, workout, or weigh-in", async ({ page }) => {
  expect(planUrl, 'the first test must run first').not.toBe('')
  await signIn(page, 'b', '/plans')
  await expect(page.getByRole('heading', { name: 'Plans' })).toBeVisible()
  await expect(page.getByText(planName)).toHaveCount(0)

  await page.goto(planUrl)
  await expect(page.getByText('Plan not found')).toBeVisible()
  await page.goto(sessionUrl)
  await expect(page.getByText('Workout not found')).toBeVisible()
  await page.goto('/workout/history')
  await expect(page.getByRole('heading', { name: 'Workout history' })).toBeVisible()
  await expect(page.getByText(planName)).toHaveCount(0)
  await page.goto('/progress/weight')
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible()
  await expect(page.getByText(`${weight} lb`, { exact: true })).toHaveCount(0)
})
