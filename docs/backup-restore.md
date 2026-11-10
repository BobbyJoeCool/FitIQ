# Backup and restore

How to back up FitIQ's hosted database and restore it locally (step 8.4). This is also the starting point for moving the backend to the home server later ([future versions](future-versions.md), FV-3).

## Why you need to do this yourself

The Supabase **Free plan has no automatic backups you can download**. Paid plans keep daily backups (Pro: 7 days). Supabase's guidance for Free projects is to export regularly with the CLI and keep copies off-site. Sources, checked 2026-11-09:

- [Supabase docs: database backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase FAQ: Free plan backups](https://supabase.com/kb/faqs/platform/free-plan-backups)
- [Production checklist](https://supabase.com/docs/guides/deployment/going-into-prod): backups aren't downloadable on Free

**Suggested habit:** take a dump once a month, and before any risky change (a new migration, a big import, the server move). Keep the last few somewhere private, like an encrypted drive or your password manager's file storage. **Never commit a dump**: it contains everyone's data and password hashes. `backups/` is gitignored for that reason.

People can also download their own data any time from **Settings → Download your data** (CSV). That's a per-person copy, not a restorable backup.

## What a dump contains

`scripts/backup.sh dump` writes three files to `backups/<timestamp>-<source>/`:

| File | Contents | Used for |
| --- | --- | --- |
| `data.sql` | Every row in the `public` schema (FitIQ's tables) and the `auth` schema (accounts, password hashes, sessions) | Restoring |
| `schema.sql` | Tables, policies, functions, triggers | Reference, and restoring into plain Postgres |
| `roles.sql` | Database roles | Restoring into plain Postgres |

The schema is also in Git (`supabase/migrations/`), which is why a local restore loads only `data.sql`.

## Back up the hosted project

Needs the Supabase CLI linked to the project (README, Hosted setup step 2), Docker running, and the database password from your password manager.

```sh
scripts/backup.sh dump remote
```

The CLI asks for the database password. You can also pass it with `--password`, but don't leave it in your shell history. The script prints the folder it wrote to and its size.

## Restore into the local stack

This replaces everything in the **local** Docker stack. The hosted project is never touched.

```sh
npm run db:start                        # if the local stack isn't running
scripts/backup.sh restore-local backups/<folder>
```

What it does:

1. `supabase db reset`: rebuilds the local schema from this repo's migrations, the same ones the hosted project runs.
2. Loads `data.sql` in one transaction with `session_replication_role = replica`. That skips triggers (no duplicate profiles, no ownership checks mid-load) and foreign-key ordering.
3. Prints row counts.

### Check the restore is complete

Compare the counts with the hosted project. Run this in the hosted dashboard's **SQL Editor**:

```sql
select 'auth.users' as table_name, count(*) from auth.users
union all select 'profiles', count(*) from public.profiles
union all select 'custom_exercises', count(*) from public.custom_exercises
union all select 'workout_plans', count(*) from public.workout_plans
union all select 'workout_plan_exercises', count(*) from public.workout_plan_exercises
union all select 'workout_sessions', count(*) from public.workout_sessions
union all select 'workout_session_exercises', count(*) from public.workout_session_exercises
union all select 'workout_sets', count(*) from public.workout_sets
union all select 'weight_history', count(*) from public.weight_history
union all select 'body_measurements', count(*) from public.body_measurements
union all select 'cardio_sessions', count(*) from public.cardio_sessions;
```

Then run `scripts/backup.sh counts` locally. The numbers should match, as long as nobody logged anything between the dump and the query. To check it end to end, point a local `.env` at the local stack (`npx supabase status` prints the values), run `npm run dev`, and sign in with your real account: your data should be there.

**Tested on the local stack (2026-11-09):** dump, reset, restore. All 11 table counts matched, and the restored accounts signed in with their original passwords. Step 8.5 repeats this with a real hosted dump.

## Restoring into plain Postgres (the server move, later)

A plain Postgres server doesn't have Supabase's `auth` schema or roles. The move will run self-hosted Supabase (Auth and the REST API) on the home server, so the local-stack restore above is the rehearsal. For a bare Postgres copy, Supabase's migration guide uses all three files:

```sh
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql --dbname "$TARGET_DATABASE_URL"
```

## If something goes wrong on the hosted project

1. Don't panic, and don't run more migrations.
2. Take a dump right away, even of the broken state.
3. Restore your last good dump locally and check it.
4. To put data back on the hosted project, load the affected tables' rows from the good `data.sql` with `psql` against the hosted connection string (Dashboard → Connect). Do it one table at a time, after a fresh dump. If unsure, ask before writing to production.
