# FitIQ v1 build plan

Parent issue: #1. Product and technical plan: [`plan.md`](../plan.md).

Each step is one GitHub issue, a sub-issue of #1, in its phase's milestone. `ready-for-agent` steps can be picked up by an agent; `ready-for-human` steps need Bob (accounts, dashboards, a phone, or a decision). Blocked-by links are set as native GitHub dependencies. Work on a step logs to `DevNotes/Logs/phase-N.md` under `## Phase N.M`.

## Phases

### Phase 0 — Decisions

Goal: Settle the open questions in plan.md section 17 that change how Phases 1 and 2 are built.

Step 0.1 (repo setup, this plan, and the issues) is done and has no issue.

Done when: Units, sharing, and domain answers are recorded in plan.md section 17 and anywhere else they change the plan.

### Phase 1 — Foundation

Goal: A deployed React + TypeScript + Vite shell on GitHub Pages, CI checks, a Supabase project, a data-access layer, and the keep-alive job.

Done when: A push to `main` deploys automatically, and the deployed app can reach Supabase.

### Phase 2 — Auth and security

Goal: Invite-only sign-in, profiles, the full v1 schema as migrations with RLS on every user-owned table, and an automated two-account RLS test.

Done when: Each account sees only its own data, proven by the RLS test script.

### Phase 3 — Exercise library

Goal: A licensed exercise catalog in Supabase with search, filters, detail views, demo links, and custom exercises.

Done when: A user can find an exercise and open its demo.

### Phase 4 — Workout plans

Goal: Reusable plans: create, edit, add exercises with targets, rest, and notes, reorder, archive.

Done when: A user can save a reusable routine.

### Phase 5 — Workout recording

Goal: Start a workout, log sets on a phone with per-set saving, skip, finish, and review it in history.

Done when: A completed workout appears in history, and no completed set is lost to a closed browser or sleeping phone.

### Phase 6 — Progress

Goal: Weigh-ins, body measurements, charts, workout frequency, per-exercise history, and the dashboard.

Done when: A user can review progress over time.

### Phase 7 — Cardio and polish

Goal: Cardio logging, the settings screen and unit preferences, PWA install, and mobile polish.

Done when: Comfortable to use on a phone mid-workout, and installable as a PWA.

### Phase 8 — Family rollout and backup

Goal: E2E tests, CSV export, account deletion, backup and restore, then real family accounts.

Done when: Family members use it independently and can export their data.

### Phase 9 — Portfolio polish

Goal: A demo account, an architecture summary, and a README that shows FitIQ working near the top.

Done when: A stranger can understand and try FitIQ in two minutes.

## Steps

| Step | Issue | Title | Label | Blocked by |
|---|---|---|---|---|
| 0.2 | #2 | Answer the open questions that shape Phases 1 and 2 | `ready-for-human` | None |
| 1.1 | #3 | Scaffold Vite, React, TypeScript, linting, and Vitest | `ready-for-agent` | None |
| 1.2 | #4 | Responsive app shell and routes for every screen | `ready-for-agent` | #3 |
| 1.3 | #5 | CI checks on pull requests | `ready-for-agent` | #3 |
| 1.4 | #6 | Deploy to GitHub Pages with SPA routing | `ready-for-agent` | #4, #5, #2 |
| 1.5 | #7 | Create and configure the Supabase project | `ready-for-human` | #2 |
| 1.6 | #8 | Supabase client, data-access layer, and env docs | `ready-for-agent` | #3, #7 |
| 1.7 | #9 | Weekly Supabase keep-alive workflow | `ready-for-agent` | #7 |
| 2.1 | #10 | Supabase CLI and migration workflow | `ready-for-agent` | #8 |
| 2.2 | #11 | Profiles table with RLS | `ready-for-agent` | #10 |
| 2.3 | #12 | Sign-in, sign-out, and protected routes | `ready-for-agent` | #11 |
| 2.4 | #13 | Invite links: set-password page and owner runbook | `ready-for-agent` | #12 |
| 2.5 | #14 | Full v1 schema with constraints, ownership triggers, and RLS | `ready-for-agent` | #11, #2 |
| 2.6 | #15 | Two-account RLS test script | `ready-for-agent` | #14 |
| 2.7 | #16 | Create two test accounts and pass the RLS test | `ready-for-human` | #13, #15 |
| 3.1 | #17 | Evaluate exercise data sources and licenses | `ready-for-agent` | None |
| 3.2 | #18 | Repeatable exercise import script | `ready-for-agent` | #17, #14 |
| 3.3 | #19 | Run the exercise import against the hosted project | `ready-for-human` | #18 |
| 3.4 | #20 | Exercise search and filters | `ready-for-agent` | #18, #12 |
| 3.5 | #21 | Exercise detail view with images and demo links | `ready-for-agent` | #20 |
| 3.6 | #22 | Custom exercises | `ready-for-agent` | #20 |
| 4.1 | #23 | Plan list and create or edit a plan | `ready-for-agent` | #14, #12 |
| 4.2 | #24 | Add exercises to a plan with targets, rest, and notes | `ready-for-agent` | #23, #21 |
| 4.3 | #25 | Reorder and archive plans | `ready-for-agent` | #24 |
| 5.1 | #26 | Start a workout from a plan or from scratch | `ready-for-agent` | #24 |
| 5.2 | #27 | Active workout: log sets with per-set saving | `ready-for-agent` | #26 |
| 5.3 | #28 | Skip, next, mid-workout changes, and offline banner | `ready-for-agent` | #27 |
| 5.4 | #29 | Finish, review, and workout history | `ready-for-agent` | #27 |
| 5.5 | #30 | Log a real workout on a phone | `ready-for-human` | #28, #29 |
| 6.1 | #31 | Weigh-ins: log and history | `ready-for-agent` | #14, #12 |
| 6.2 | #32 | Weight chart with date ranges | `ready-for-agent` | #31 |
| 6.3 | #33 | Body measurements: log and charts | `ready-for-agent` | #32 |
| 6.4 | #34 | Workout frequency, totals, per-exercise history, and records | `ready-for-agent` | #29, #32 |
| 6.5 | #35 | Dashboard | `ready-for-agent` | #26, #31 |
| 7.1 | #36 | Cardio logging with a walking pad preset | `ready-for-agent` | #14, #12 |
| 7.2 | #37 | Settings screen and unit preferences | `ready-for-agent` | #12, #27 |
| 7.3 | #38 | PWA manifest, icons, and cached app shell | `ready-for-agent` | #6 |
| 7.4 | #39 | Mobile polish, empty states, and image optimization | `ready-for-agent` | #28, #34, #36 |
| 7.5 | #40 | Phone usability pass mid-workout | `ready-for-human` | #38, #39 |
| 8.1 | #41 | Playwright E2E suite | `ready-for-agent` | #29, #31 |
| 8.2 | #42 | CSV export of your own data | `ready-for-agent` | #29, #33, #36 |
| 8.3 | #43 | Account deletion workflow | `ready-for-agent` | #37 |
| 8.4 | #44 | Backup and restore docs and script | `ready-for-agent` | #14 |
| 8.5 | #45 | Test a restore into local Postgres | `ready-for-human` | #44 |
| 8.6 | #46 | Family rollout | `ready-for-human` | #16, #40, #41, #42, #43, #45 |
| 9.1 | #47 | Seeded demo account | `ready-for-agent` | #46 |
| 9.2 | #48 | Architecture summary | `ready-for-agent` | #46 |
| 9.3 | #49 | README with screenshots and demo GIF | `ready-for-agent` | #47, #48 |

## Critical path

0.2 → 1.4 / 1.5 → 1.6 → 2.1 → 2.2 → 2.5 → 2.6 → 2.7 gates everything that stores real data. 1.1, 3.1, and 0.2 can start immediately and in parallel.
