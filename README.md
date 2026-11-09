# FitIQ

A private workout and progress tracker for my household: exercise library with demos, reusable workout plans, fast set logging on a phone, and weight, measurement, and cardio tracking. Installable as a PWA, $0 a month to run.

**Live:** [fitiq.bobbyjoecool.dev](https://fitiq.bobbyjoecool.dev) (invite-only; goes live once the hosted setup below is done)

**Status:** first sprint: app shell, sign-in, and private profiles. Screenshots and a demo GIF will go here once v1 works.

## Stack

React, TypeScript, and Vite on GitHub Pages; Supabase Auth and PostgreSQL with Row Level Security; Vitest, React Testing Library, and Playwright. Exercise data comes from [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (public domain).

## Docs

- [`plan.md`](plan.md): product and technical plan
- [`docs/build-plan.md`](docs/build-plan.md): phased build plan, one GitHub issue per step (tracked in [#1](https://github.com/BobbyJoeCool/FitIQ/issues/1))

## Setup

### Local development

Requires Node 24 and, for a local database, Docker.

```sh
npm install
cp .env.example .env    # then fill in the two values
npm run dev             # http://localhost:5173
```

`.env` holds only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Both end up in the public JS bundle, which is fine for the publishable key because Row Level Security protects the data. The secret (service-role) key and the database password never go in this repo or in any `VITE_` variable; the app refuses to start if it sees a secret key. If either value is missing, the app shows a configuration error page instead of a blank screen.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck and production build (also writes `dist/404.html` for SPA routing on Pages) |
| `npm run lint` | oxlint, including a rule that only `src/lib/` may import the Supabase client |
| `npm run typecheck` | TypeScript |
| `npm test` | Vitest unit and component tests |
| `npm run format` / `format:check` | Prettier |
| `npm run test:rls` | Two-account RLS test (see below) |

All database access goes through `src/lib/data/`. Components never import Supabase directly.

### Database migrations

Schema changes, including RLS policies, are SQL files in `supabase/migrations/`, applied with the Supabase CLI (installed as a dev dependency, so `npx supabase` works).

```sh
npm run db:new -- add_something   # create supabase/migrations/<timestamp>_add_something.sql
npm run db:start                  # local stack in Docker, built from the migrations alone
npm run db:reset                  # rebuild the local database from scratch
npx supabase link --project-ref <ref>   # once, to target the hosted project
npm run db:push                   # apply new migrations to the hosted project
```

`npx supabase status` prints the local URL and publishable key for a local `.env`. Local auth mirrors the hosted rules: signups are off, so create local users in Studio (<http://127.0.0.1:54323>) or with the local admin API. No dashboard schema edits on the hosted project: if it isn't in a migration, it doesn't exist.

### RLS test (run before every rollout)

`tests/rls/rls-test.mjs` signs in as two test accounts with the publishable key and checks that neither can read, update, delete, or insert the other's rows on every user-owned table, and that a signed-out client sees nothing. It exits non-zero on any leak.

```sh
cp tests/rls/.env.example tests/rls/.env   # URL, publishable key, two TEST accounts
npm run test:rls
```

Run it against the hosted project before every rollout, and never put real family data in until it passes.

### Hosted setup (one time, owner only)

1. **Supabase project** (free tier). In Authentication > Sign In / Providers, turn off *Allow new users to sign up*. In Authentication > URL Configuration, set the Site URL to `https://fitiq.bobbyjoecool.dev` and add `http://localhost:5173` to the redirect URLs. Keep the secret key and database password in a password manager only.
2. **Migrations:** `npx supabase link --project-ref <ref>` then `npm run db:push`.
3. **Repo variables** (Settings > Secrets and variables > Actions > Variables, not secrets, since both values are public): `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The deploy and keep-alive workflows read them.
4. **GitHub Pages:** Settings > Pages > Source: *GitHub Actions*.
5. **Custom domain:** add a DNS `CNAME` record `fitiq` → `bobbyjoecool.github.io`, then set `fitiq.bobbyjoecool.dev` as the custom domain in Settings > Pages and tick *Enforce HTTPS*. The deploy workflow picks up the base path from the Pages settings, so the build works at `bobbyjoecool.github.io/FitIQ/` before the domain is set and at `/` after; re-run the deploy once the domain changes.
6. **Accounts:** invite each person from Authentication > Users. A profile row is created automatically with imperial units.

### Deploys and keep-alive

- `.github/workflows/ci.yml` runs lint, format check, typecheck, tests, and a build on every pull request and push to `main`.
- `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`.
- `.github/workflows/keepalive.yml` runs one tiny database query (`keepalive()`) twice a week so the free Supabase project isn't paused. Supabase pauses Free-plan projects after a week without enough database activity ([Supabase docs](https://supabase.com/docs/guides/platform/free-project-pausing), checked 2026-11-08). It can also be run by hand from the Actions tab.
