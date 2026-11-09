import { USERS } from './support'

/** Creates the two local test users if they don't exist yet. */
export default async function globalSetup() {
  const api = process.env.E2E_API_URL!
  const key = process.env.E2E_SECRET_KEY!
  for (const user of Object.values(USERS)) {
    const response = await fetch(`${api}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password, email_confirm: true }),
    })
    // 422: already exists from an earlier run, which is fine.
    if (!response.ok && response.status !== 422) {
      throw new Error(`Could not create ${user.email}: ${response.status} ${await response.text()}`)
    }
  }
}
