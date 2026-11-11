# FitIQ: Product and Technical Plan

A private workout and progress tracker for a household of 2 to 4 people. Family use comes first. Portfolio presentation is a secondary goal.

## 1. Decisions already made

| Decision | Choice |
|---|---|
| Backend | Supabase (free tier) for Auth and PostgreSQL. May move to the home MacBook server later. |
| Frontend hosting | GitHub Pages (static files only) |
| Audience | Family first, portfolio second |
| Offline | Installable PWA, online-only logging in v1 |
| Signups | Invite-only. No public registration. |
| Frontend URL | `https://fitiq.bobbyjoecool.dev` (custom domain on GitHub Pages) |
| Default units | Imperial: pounds and inches for every account, changeable per user |
| Sharing | Fully private in v1. Family sharing is a later version. |
| Exercise catalog | Free Exercise DB, read at runtime from a pinned commit. Not stored in Postgres in v1. |

## 2. Goals and non-goals

**Goals**

- 2 to 4 individual accounts, each with private workout history, weight, and measurements.
- Searchable exercise library with instructions and demonstrations.
- Reusable workout plans.
- Fast set logging on a phone during a workout.
- Weight, measurement, and cardio tracking (walking pad included).
- Works on phone, tablet, and desktop. Installable as a PWA.
- $0 recurring cost.
- Personal data export, and a backend that can be moved.

**Non-goals for v1**

Public profiles, social features, nutrition, wearables, AI-generated plans, custom video hosting, native mobile apps, offline logging with sync.

## 3. Stack

| Area | Choice |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | CSS Modules or plain CSS with shared design tokens |
| Routing | React Router (see the GitHub Pages note in section 4) |
| Hosting | GitHub Pages, deployed by GitHub Actions |
| Auth and DB | Supabase Auth and PostgreSQL with Row Level Security |
| Exercise images | Loaded from the pinned Free Exercise DB commit on jsDelivr, not committed to the repo |
| Exercise videos | External links or embeds, never hosted by FitIQ |
| Unit/component tests | Vitest, React Testing Library |
| E2E tests | Playwright |

GitHub Pages serves static files only. The browser talks to Supabase directly over HTTPS. Add serverless functions later only if something needs a secret key or scheduled processing.

## 4. Hosting constraints to plan around

1. **Public repo required.** GitHub Pages on a free account needs a public repository. That fits the portfolio goal, but it means no secrets in the repo, ever, and media licensing matters more (section 7).
2. **Supabase pauses inactive free projects** after roughly a week. Add a scheduled GitHub Actions job (weekly) that makes a lightweight request to the project so it stays active. Verify the current inactivity rules before launch.
3. **SPA routing on Pages.** Refreshing a nested route returns a 404 on static hosting. Use a `404.html` redirect fallback or a hash router. Test refresh on nested routes.
4. **Vite `base`** must match the Pages URL. With the custom domain `fitiq.bobbyjoecool.dev` the app lives at `/`. The deploy workflow reads the base path from GitHub's Pages config, so the build also works at `bobbyjoecool.github.io/FitIQ/` before the domain is live. Confirm images and routes work on the deployed URL, not just locally.
5. **Auth redirect URLs.** Add `https://fitiq.bobbyjoecool.dev` and `http://localhost:5173` to Supabase's allowed redirect list.
6. **Custom domain.** A `CNAME` DNS record `fitiq` → `bobbyjoecool.github.io`, the domain set in the repo's Pages settings, and HTTPS enforced. With Actions-based deploys the domain lives in repo settings, not a `CNAME` file.

## 5. Keeping the backend portable

The MacBook move should stay cheap. To keep it that way:

- Write all schema changes as plain SQL migrations in `supabase/migrations/`. No undocumented dashboard edits.
- Keep RLS policies in those migrations.
- Put all Supabase calls behind a thin data layer (`src/lib/data/`), not scattered through components.
- Avoid Supabase-only features (Edge Functions, Storage, Realtime) in v1. Auth, Postgres, and the auto-generated API are all available in self-hosted Supabase.
- Document the export and restore procedure (Phase 8) and test a restore into a local Postgres once.

**What the move looks like.** The frontend stays on GitHub Pages; only Auth and Postgres move to the home server. Family members will use FitIQ outside the house, and their browsers talk to the backend directly, so the self-hosted backend must be reachable from the internet over HTTPS with a valid certificate (a page served over HTTPS cannot call an `http://` API). That means a public hostname such as `api.bobbyjoecool.dev` plus a tunnel or reverse proxy (for example Cloudflare Tunnel), with the server patched and backed up. The frontend change is then only the two `VITE_SUPABASE_*` values. This is post-v1 work.

## 6. Accounts, privacy, and security

- Disable public signups in Supabase. The owner creates or invites each family member.
- **Fully private in v1.** Each user can read and write only their own profile, plans, sessions, sets, weight, measurements, cardio records, and custom exercises. No family member can see another's data. Opt-in sharing is a later version and will need its own RLS design.
- The shared exercise catalog is not in the database in v1 (section 7), so there is no shared table for the client to write to. Custom exercises are readable and writable only by their creator.
- **RLS on every user-owned table.** Add `user_id` to child tables (`workout_session_exercises`, `workout_sets`, `workout_plan_exercises`) and use `auth.uid() = user_id` on all of them. Checking ownership through parent joins on every query is slower and easier to get wrong.
- Add a constraint or trigger so a child row's `user_id` must match its parent's.
- The publishable key may live in frontend code. The service-role key and DB password never do.
- Validate input in the client and with database constraints (CHECK constraints on units, positive values, etc.).
- Before real data goes in, test with two accounts that neither can read, change, or delete the other's rows by editing IDs in requests. Automate this as a script in `tests/`.

## 7. Exercise library

### Source

**Chosen: Free Exercise DB** (`github.com/yuhonas/free-exercise-db`, The Unlicense, about 870 exercises with images). RepDB was the other candidate. MuscleWiki is a reference only. Do not copy or redistribute its content.

### Source evaluation (record before relying on it)

For each source, record in `docs/exercise-sources.md`:

1. Repository or website.
2. License for metadata.
3. License for each media type (images, videos).
4. Required attribution.
5. Whether redistribution and local hosting are allowed.
6. Whether external links are stable and embeddable.

A code license does not automatically cover images or videos. If rights are unclear, import metadata only and link out for media. Because the repo is public, anything committed is redistributed.

### Storage (v1: read at runtime, not imported)

- **Catalog metadata** is not copied into Postgres. The app fetches the dataset's `dist/exercises.json` from jsDelivr, pinned to one commit SHA, through `src/lib/data/exercises.ts`, and caches it in the browser. Pinning means upstream changes or renames never break saved plans; moving to a newer commit is a deliberate one-line change.
- **Exercise IDs** are the dataset's own string IDs (e.g. `Barbell_Squat`). Plans and sessions store that ID as `catalog_exercise_id`.
- **Images** load from the same pinned commit on jsDelivr, lazy-loaded. Nothing is committed to `public/exercises/` in v1.
- **Custom exercises** live in a user-owned `custom_exercises` table and are merged into search results on the client.
- **Videos**: the dataset has none. A video is stored only as a URL plus source name on custom exercises, loaded on tap, never in search results, with a plain link if embedding is blocked.
- **Sessions keep history safe on their own**: each session exercise copies the exercise name at the time it was performed, so a catalog change never rewrites history.
- Importing the catalog into Postgres (to edit or extend it, or to drop the jsDelivr dependency) is a possible later step, not v1.

### Library features

Search by name. Filter by muscle, equipment, movement type, and difficulty. Detail view with instructions, images, optional video, and Add to Plan (adds the exercise to one of your plans; starting a workout is Phase 5). Custom exercises. Exercises with no media are clearly marked.

## 8. Data model

PostgreSQL, UUID primary keys, UTC timestamps, foreign keys and indexes on ownership and relationship columns. Start with a small, correct schema.

| Table | Key fields |
|---|---|
| `profiles` | id (= auth user ID), display_name, preferred weight unit (default `lb`), preferred length unit (default `in`), timestamps |
| `custom_exercises` | id, user_id, name, description, primary_muscles, secondary_muscles, equipment, difficulty, movement_type, video_url, video_source_name, is_archived, timestamps |
| `workout_plans` | id, user_id, name, description, is_archived, timestamps |
| `workout_plan_exercises` | id, user_id, plan_id, catalog_exercise_id (text, nullable), custom_exercise_id (nullable), sort_order, target_sets, target_reps (text, allows "8-12"), rest_seconds, target_seconds (hold), target_release_seconds (break between repeated holds), per_side, notes |
| `workout_sessions` | id, user_id, plan_id (nullable), name, started_at, completed_at, notes |
| `workout_session_exercises` | id, user_id, session_id, catalog_exercise_id (text, nullable), custom_exercise_id (nullable), exercise_name (copied at the time), sort_order, is_skipped, notes, and the plan's targets copied at the start |
| `workout_sets` | id, user_id, session_exercise_id, set_number, reps, weight_value, weight_unit, is_bodyweight (weight_value is then added weight), duration_seconds, distance_value, distance_unit, is_completed, notes |
| `weight_history` | id, user_id, recorded_at, weight_value, weight_unit, notes |
| `body_measurements` | id, user_id, recorded_at, measurement_type, measurement_value, measurement_unit, notes |
| `cardio_sessions` | id, user_id, activity_type, started_at, duration_seconds, distance_value, distance_unit, incline, notes |

**Rules**

- Null is allowed where a field does not apply (a plank has duration, not reps).
- A plan or session exercise points at exactly one of `catalog_exercise_id` or `custom_exercise_id` (CHECK constraint). The catalog ID has no foreign key because the catalog is not in the database.
- Store each set's own weight unit so changing a unit preference never rewrites history. New accounts default to `lb` and `in`.
- Archive plans and exercises instead of deleting them when sessions reference them.
- Editing or archiving a plan must never change completed sessions. Sessions copy what was performed, not a live reference to plan targets.
- Delete behavior (cascade vs restrict) is decided per relationship before the first migration.

## 9. Screens

1. **Dashboard:** today's planned workout, Start Workout, recent activity, latest weight, quick links. Few charts.
2. **Exercise library:** search, filters, detail view, create custom exercise.
3. **Plan builder:** create, edit, reorder, set targets and rest, archive.
4. **Active workout:** built for one-handed phone use. Per exercise: name, demo link, planned vs actual sets, enter reps and weight, mark sets complete, skip, next. Each completed set saves to Supabase immediately, with visible saving and error states and a retry button. A closed browser or sleeping phone must not lose completed sets.
5. **Progress:** weight chart, workout frequency, total workouts, per-exercise history, measurement charts, personal records where reliably computable. Use clear date ranges and units, and avoid implying that scale changes over days mean fat gain or loss.
6. **Cardio:** activity type, duration, distance, incline, notes. Walking pad is a named preset.
7. **Settings:** display name, units, sign out, CSV export, privacy info, account deletion workflow.

## 10. PWA (v1 scope)

In scope: web app manifest, icons, installable on phones, cached app shell, cached exercise catalog JSON and images (runtime cache for the pinned jsDelivr URLs).

Out of scope: offline logging and background sync. When offline, show a clear banner and block saves with a message rather than silently failing. Only the in-progress workout screen keeps unsaved input in component state so a failed request can be retried without retyping.

Offline workout entry (local queue, conflict handling, retry) is a later milestone.

## 11. Cost

Target: $0/month. GitHub Pages, Supabase Free, external video links, and the exercise catalog served free from jsDelivr. The custom domain uses the existing `bobbyjoecool.dev` registration.

Protecting the quota:

- Text and numbers only in Postgres. No videos in Supabase.
- Paginate histories. Select only needed columns. No polling.
- Cache the shared exercise catalog in the browser.
- Compress images and lazy-load them.

The free tier has storage, bandwidth, pause, and backup limits. Treat it as not the only copy of anyone's data: export periodically, keep migrations in Git, and re-verify current limits before launch.

## 12. Repository layout

```
fitiq/
  public/
    icons/
  src/
    app/
    components/{common,forms,charts,exercise}/
    features/{auth,dashboard,exercises,workout-plans,workout-sessions,progress,cardio,settings}/
    hooks/
    lib/
      data/            # all Supabase access lives here
      supabase.ts
      units.ts
      validation.ts
    types/
    styles/
  supabase/
    migrations/
    seed/
  docs/
    exercise-sources.md
    backup-restore.md
  tests/{unit,e2e,rls}/
  .github/workflows/{deploy.yml,keepalive.yml}
  .env.example
  README.md
  plan.md
```

Environment variables (frontend-safe only):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## 13. Testing

- **Unit:** unit conversions, workout and progress calculations, validation, date formatting, filtering.
- **Component:** exercise search and filters, plan editing, set entry, weigh-in entry, error, loading, and empty states.
- **RLS:** scripted two-account test covering read, update, and delete across accounts, run before every rollout.
- **E2E (Playwright):** sign in, create plan, search and add exercise, start workout, log sets, complete, see it in history, log a weigh-in, second user cannot see the first user's data.
- **After each deploy:** app loads, images load, auth redirect works, reads and writes work, no console errors, works on a phone.

## 14. Phases

Each phase ends with something working and deployed.

| Phase | Deliverables | Done when |
|---|---|---|
| 1. Foundation | Repo, Vite + React + TS, responsive shell, GitHub Actions deploy, Pages live, Supabase project, env docs, keep-alive job | A push to `main` deploys automatically |
| 2. Auth and security | Supabase Auth, invite-only signup, sign-in/out, profiles, first migrations, RLS, data-access layer, two test accounts, RLS test script | Each account sees only its own data |
| 3. Exercise library | Source license doc, catalog client for the pinned Free Exercise DB, search, filters, detail view, custom exercises with video links | A user can find an exercise and open its demo |
| 4. Workout plans | Create, edit, reorder, archive, targets, rest, notes | A user can save a reusable routine |
| 5. Workout recording | Start from plan, log reps and weight, mark complete, skip, per-set saving, finish and review | A completed workout appears in history |
| 6. Progress | Weigh-ins, weight chart, measurements, frequency, per-exercise history | A user can review progress over time |
| 7. Cardio and polish | Cardio logging, unit preferences, mobile workout UI polish, empty states, PWA manifest and icons, image optimization | Comfortable to use on a phone mid-workout |
| 8. Family rollout and backup | Create family accounts, verify privacy with real accounts, CSV export, backup and restore docs, tested restore | Family members use it independently and can export their data |
| 9. Portfolio polish | README with screenshots and a short demo GIF near the top, architecture summary, seeded demo account (demo data only, no real records) | A stranger can understand and try FitIQ in two minutes |

## 15. First release priorities

| Priority | Feature |
|---|---|
| Must | Individual sign-in, private records, exercise search and detail, exercise images or demo links, plans, set logging, workout history, weight history, mobile layout, installable PWA |
| Should | Body measurements, cardio and walking pad, CSV export |
| Later | Offline logging with sync, family sharing and challenges, nutrition, wearables, self-hosted backend move (needs public HTTPS access, section 5), importing the exercise catalog into Postgres, an email sender on `bobbyjoecool.dev` so invite and reset emails reach the household, cardio items in workout plans, a default rest period that exercises follow, adjust, or override, a hold-at-the-top option with a 3-second default release, and saving workout edits back to the plan, sound and voice cues for the hold timer. Tracked in [`docs/future-versions.md`](docs/future-versions.md), with a stretching upgrade added 2026-11-09, and the email sender, cardio in plans, default rest, hold at the top, plan edits from a workout, and timer sound cues added 2026-11-10 |

## 16. Risks

| Risk | Mitigation |
|---|---|
| Exercise media licensing | Free Exercise DB is public domain (The Unlicense), recorded in `docs/exercise-sources.md`. Media is hotlinked from the pinned commit, not redistributed from this repo. |
| jsDelivr or the dataset disappears | Catalog is pinned to a commit and cached in the browser; sessions copy exercise names; importing into Postgres is the fallback. |
| Supabase pausing or quota limits | Keep-alive job, usage monitoring, periodic exports, migrations in Git |
| RLS misconfiguration exposes data | `user_id` on every user-owned table, automated two-account test, no real data until it passes |
| Secret leaked in public repo | Only the publishable key in the frontend, `.gitignore` for env files, secret scanning enabled on the repo |
| Dataset or video links change | Pin the dataset commit, copy exercise names into sessions, allow replacing a video URL without touching history |
| Backend lock-in | Plain SQL migrations, data-access layer, tested restore into local Postgres |

## 17. Open questions (answered 2026-11-08)

1. Which exercise dataset passes the license check (Phase 3)?
   **Free Exercise DB.** For v1 the app reads it at runtime rather than storing it in the database (section 7).
2. Preferred default units for each family member (lb/kg, in/cm)?
   **Imperial** (lb and in) for everyone, still changeable per user in Settings.
3. Should family members ever see each other's progress (opt-in sharing), or stay fully private?
   **Fully private for v1.** Sharing comes in a future version (section 6).
4. Custom domain, or the default `github.io` URL?
   **Custom domain: `https://fitiq.bobbyjoecool.dev`** (section 4).
5. When the home MacBook server move happens, will the family access FitIQ from outside the house?
   **Yes.** The app stays on GitHub Pages and only the database (and Auth) moves to the server, so the server must be reachable from the internet over HTTPS (section 5).

## 18. First sprint

1. Create the public GitHub repo with this plan.md.
2. Scaffold React, TypeScript, Vite.
3. Build a responsive navigation shell.
4. Deploy a placeholder to GitHub Pages and confirm routing and asset paths.
5. Create the Supabase project and disable public signups.
6. Connect the frontend through the data-access layer.
7. Add sign-in and sign-out.
8. Create `profiles` with RLS in a migration.
9. Test with two accounts.
10. Add the keep-alive workflow and setup instructions.

At the end, the app is deployed, talks to its database, and can securely tell two users apart.
