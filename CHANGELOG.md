# Changelog

All notable changes to FitIQ. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

Fixes and improvements from the v1 manual test, 2026-11-10. Two migrations: `20261111000000_plan_release_seconds.sql` and `20261111000100_bodyweight_sets.sql`.

### Added

- **Bodyweight sets.** A Body weight checkbox on strength sets, ticked by default for body-only exercises, with optional added weight: "10 × Body", "8 × Body + 25 lb". They count for Most reps, not for Heaviest, Best set, or volume. The workouts CSV has a `bodyweight` column ([#65](https://github.com/BobbyJoeCool/FitIQ/issues/65)).
- **Repeated holds.** A Release (sec) target for exercises like the ab roller. The timer runs hold, release, hold for the target reps, then the other side if per side, and logs the holds as reps ([#67](https://github.com/BobbyJoeCool/FitIQ/issues/67)).
- **Each side toggle** on timed sets during a workout. It changes that set only, not the plan ([#70](https://github.com/BobbyJoeCool/FitIQ/issues/70)).

### Changed

- The rest countdown replaces **Complete set**, in red, with **Skip rest**, instead of floating over the screen ([#66](https://github.com/BobbyJoeCool/FitIQ/issues/66)).
- The exercise picker's **Done** button sits in the side navigation on tablet and desktop ([#64](https://github.com/BobbyJoeCool/FitIQ/issues/64)).

### Fixed

- The workout page no longer runs off the right edge on tablet and desktop, and nothing covers Previous, Skip, and Next on phones ([#68](https://github.com/BobbyJoeCool/FitIQ/issues/68)).
- The hold timer follows the Seconds field instead of the plan's target ([#69](https://github.com/BobbyJoeCool/FitIQ/issues/69)).

## Future improvements

Planned or wanted after v1. Details, dependencies, and status for each are in [`docs/future-versions.md`](docs/future-versions.md).

- **Email sender on `bobbyjoecool.dev`** (FV-9): send invite and password reset emails from the site's own domain, so family members can be invited by email and reset their own passwords.
- **Cardio in workout plans** (FV-10): add a cardio item, like a walking pad warm-up, to a plan with target minutes, distance, and incline. It's logged during the workout and shows on the Cardio tab.
- **Programs** (FV-7): group plans into a split, by rotation or a weekly schedule, so the dashboard knows today's workout.
- **Offline workout logging with sync** (FV-2): queue sets on the phone without signal and sync them later.
- **Move the backend to the home server** (FV-3): self-host Auth and Postgres. Only the two frontend settings change.
- **Opt-in family sharing and challenges** (FV-4): each person chooses what to share and with whom.
- **Import the exercise catalog into Postgres** (FV-5): edit or extend catalog exercises, and stop depending on a CDN.
- **Delete plans that no workout uses** (FV-6): today plans can only be archived.
- **Kinds of stretch** (FV-1, item 5): tag stretches as static, dynamic, or foam rolling, for warm-up and cool-down starters.

## [1.0.0] — 2026-11-10

The first release: a private workout and progress tracker for a household of 2 to 4 people, live at [fitiq.bobbyjoecool.dev](https://fitiq.bobbyjoecool.dev).

### Accounts and privacy

- Invite-only sign-in with Supabase Auth. Public sign-up is off.
- Every account is private. Row Level Security is on every user-owned table, and ownership triggers stop any row pointing at another person's data.
- A two-account RLS test checks every table, including cross-parent cases (188 checks).
- Change password in Settings. Invite and password reset links (`/auth/confirm`) are ready for when an email sender is set up.
- Download your data as CSV: workouts (one row per set), weigh-ins, measurements, and cardio, each with its unit.
- Request account deletion from Settings, with a cancel option. The owner carries out the request.

### Exercise library

- 876 exercises from [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (public domain), with images and steps.
- Search, and filter by muscle, equipment, movement type, and difficulty. Filters survive going into an exercise and back.
- Custom exercises, with an optional video link. They can be edited and archived.
- Each exercise page has **Add to plan** and **Your history**.

### Plans

- Reusable plans with target sets, reps, hold time (with "each side"), rest, and notes, plus up and down reordering.
- Starter plans, beginning with a 14-stretch **Full-body stretch** routine that copies into your own plans.

### Workouts

- Start from a plan or empty. Only one workout can be in progress at a time.
- Log one set at a time with −/+ steppers. "Last time" numbers prefill each set.
- A rest timer after each set, and a hold timer for timed exercises with a switch-sides pause.
- Jump between exercises, skip and unskip, and add exercises mid-workout.
- Each set saves the moment you complete it, so closing the browser or a sleeping phone loses nothing.
- A finish review with time, sets, and volume, then a detail page in workout history.
- Offline, saving is blocked with a clear banner rather than losing data.

### Progress and dashboard

- Weigh-ins with a weight chart for 30 days, 90 days, 1 year, or all time, with keyboard and table views.
- Body measurements, including body fat, each with its own chart.
- Workouts per week, and per-exercise history with exact personal records.
- A dashboard with the workout in progress or up next, this week, latest weight, recent workouts, and recent cardio.

### Cardio and settings

- Cardio sessions with a walking pad preset: minutes, distance, and incline.
- Pounds or kilograms, inches or centimetres. Stored values keep their own unit and are never rewritten.

### App and operations

- An installable PWA with a teal dumbbell icon. It opens offline, and catalog images are cached.
- A phone-first layout with thumb-sized controls.
- CI runs lint, format check, typecheck, unit and component tests (192), a build, and Playwright end-to-end tests against a local Supabase stack.
- Deploys to GitHub Pages on every push to `main`. A keep-alive workflow stops the free Supabase project from pausing.
- Backup and restore scripts for the hosted database, tested with a real restore.
- A public demo account with about eight weeks of made-up data, reseeded weekly.
- [`docs/architecture.md`](docs/architecture.md) and a README with screenshots and a demo GIF.

### Fixed

- **Back** after editing a custom exercise returns to the library ([#53](https://github.com/BobbyJoeCool/FitIQ/issues/53)).
- "Last time" and exercise history order by the workout's date, not by when the row was saved, so back-dated or imported workouts show correctly.

[1.0.0]: https://github.com/BobbyJoeCool/FitIQ/releases/tag/v1.0.0
