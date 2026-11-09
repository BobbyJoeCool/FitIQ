# Accounts: invite, reset, and remove

The owner's runbook for FitIQ accounts (steps 2.4 and 8.3). Everything here happens in the Supabase dashboard, so the service-role key never touches the frontend or this repo. Public signups are off (plan.md section 6): an account exists only if the owner creates it.

**Real family accounts only after the RLS test passes against the hosted project** (`npm run test:rls`; see README).

## Email: the one decision to make first

Supabase's built-in email service **only delivers to members of your Supabase organization's team**, and only **2 emails an hour**. Other addresses get `email_address_not_authorized` ([Supabase: custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [changelog, 2024-09-26](https://supabase.com/changelog/29370-supabase-auth-changes-to-default-email-provider); checked 2026-11-09). So invite and reset emails won't reach family members unless you add your own email sender.

Pick one:

| | **A. No email (recommended for 2 to 4 people)** | **B. Custom SMTP** |
| --- | --- | --- |
| Adding someone | You create the account with a temporary password and tell them in person | Supabase emails them an invite link; they choose their password |
| Forgotten password | They ask you; you set a temporary one (below) | "Forgot your password?" on the sign-in screen emails a reset link |
| Setup | None | An SMTP provider with a free tier (for example Resend or Brevo), DNS records on `bobbyjoecool.dev`, and the templates below |
| Cost | $0 | $0 within the provider's free tier |

The app supports both: the invite and reset links work once SMTP is set up, and **Settings → Change password** works either way.

## One-time hosted setup

1. **Minimum password length:** Authentication → Sign In / Providers → Email → set **Minimum password length** to `10`. That matches the app and `supabase/config.toml`.
2. **URLs:** Authentication → URL Configuration → Site URL `https://fitiq.bobbyjoecool.dev`. The email links are built from it.
3. **Email templates (option B only, harmless for A):** Authentication → Emails → Templates. Paste the matching file from this repo, so links go to the app's `/auth/confirm` screen:

   | Template | Subject | Body |
   | --- | --- | --- |
   | Invite user | `You're invited to FitIQ` | `supabase/templates/invite.html` |
   | Reset password | `Reset your FitIQ password` | `supabase/templates/recovery.html` |

4. **SMTP (option B only):** Authentication → Emails → SMTP Settings, using your provider's host, port, user, and password. Keep that password in your password manager, never in the repo. Then check Authentication → Rate Limits; custom SMTP starts at 30 emails an hour.

## Add a family member

### Option A: no email

1. Authentication → Users → **Add user → Create new user**.
2. Enter their email and a temporary password (10+ characters), and tick **Auto Confirm User**.
3. Tell them the temporary password in person, not by text or email.
4. They sign in at <https://fitiq.bobbyjoecool.dev>, then go to **Settings → Change password** and choose their own.

### Option B: invite email

1. Authentication → Users → **Add user → Send invitation**, then enter their email.
2. They get "You're invited to FitIQ" and tap **Set your password**. The link opens FitIQ's set-password screen, and they're signed in when they save it. The link works once and expires in 24 hours. If it expires, send a new invitation.

**Either way:** a profile row is created automatically with imperial units (lb, in). They can change units and their display name in **Settings**.

## Forgotten password

**Option B:** they tap **Forgot your password?** on the sign-in screen, enter their email, and follow the link. It works once and expires in an hour. FitIQ shows the same message whether or not the address has an account.

**Option A**, or if email isn't arriving: set a temporary password in **SQL Editor** (the dashboard runs it with owner rights), then tell them in person and have them change it in Settings:

```sql
update auth.users
set encrypted_password = extensions.crypt('TEMPORARY-PASSWORD-HERE', extensions.gen_salt('bf'))
where email = 'person@example.com';
```

Don't save the query with the password in it.

## Remove someone

Deleting the auth user deletes **everything they own**. Every table cascades from `auth.users` ([ADR 0001](adr/0001-delete-behavior.md)). There's no undo, so first ask whether they want their data: they can download it from **Settings** (CSV export, step 8.2).

1. Find their user ID: Authentication → Users → click the person → copy **User UID**.
2. Optional, to see what will go, run this in SQL Editor:

   ```sql
   select 'workout_sessions' as table_name, count(*) from public.workout_sessions where user_id = 'USER-ID'
   union all select 'workout_sets', count(*) from public.workout_sets where user_id = 'USER-ID'
   union all select 'workout_plans', count(*) from public.workout_plans where user_id = 'USER-ID'
   union all select 'custom_exercises', count(*) from public.custom_exercises where user_id = 'USER-ID'
   union all select 'weight_history', count(*) from public.weight_history where user_id = 'USER-ID'
   union all select 'body_measurements', count(*) from public.body_measurements where user_id = 'USER-ID'
   union all select 'cardio_sessions', count(*) from public.cardio_sessions where user_id = 'USER-ID';
   ```

3. Authentication → Users → the person → **Delete user**.
4. Run the query from step 2 again. Every count should be `0`.

### Deletion requests from the app

People can ask for their account to be deleted from **Settings → Delete my account** (step 8.3). That doesn't delete anything by itself: it records the request time on their profile, and they can cancel it until you act. To see pending requests:

```sql
select p.id, u.email, p.deletion_requested_at
from public.profiles p join auth.users u on u.id = p.id
where p.deletion_requested_at is not null
order by p.deletion_requested_at;
```

Then follow **Remove someone** above, and let them know when it's done.

## The public demo account (step 9.1)

The README invites visitors to try FitIQ with a shared demo login. It's an ordinary account with made-up data, and RLS keeps it out of every family account, just as for anyone else.

**Set up once:**

1. Authentication → Users → **Add user → Create new user**: email `demo@bobbyjoecool.dev`, password `try-fitiq-demo`, and tick **Auto Confirm User**. These are public on purpose (they're in the README), so never reuse that password anywhere.
2. Seed it from your machine: copy `scripts/demo.env.example` to `scripts/demo.env`, fill in the project URL, publishable key, and the demo login, then run `npm run seed:demo`. It refuses any email without "demo" in it.
3. Optional, to reset it weekly: in **Settings → Secrets and variables → Actions**, add the variable `DEMO_EMAIL` and the secret `DEMO_PASSWORD`. The **Reseed demo account** workflow then runs every Monday, or on demand from the Actions tab.

**What a visitor can and can't do:** they see only the demo account's data. The app hides Change password and the deletion request for it, but someone could still change its password through the API. If the demo login stops working, reset the password with the SQL in **Forgotten password** above, then reseed. To take the demo down, delete the user.
