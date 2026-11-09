# Exercise data sources

FitIQ's exercise catalog comes from one source, read at runtime and never copied into this repo or into Postgres (plan.md sections 7 and 17). This file records why that is allowed and exactly what the app loads.

Checked 2026-11-08.

## Free Exercise DB (chosen)

Bob picked it in step 0.2 ([plan.md section 17](../plan.md#17-open-questions-answered-2026-11-08), issue #2).

| Question (plan.md section 7) | Answer |
| --- | --- |
| Repository | [github.com/yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) |
| Metadata license | [The Unlicense](https://github.com/yuhonas/free-exercise-db/blob/f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/LICENSE.md): released into the public domain |
| Image license | The same Unlicense covers the whole repository, images included. The README calls it an "Open Public Domain Exercise Dataset". |
| Video license | Not applicable: the dataset has no videos |
| Required attribution | None. FitIQ credits it anyway on each exercise detail screen. |
| Redistribution and local hosting | Allowed (public domain). FitIQ doesn't need either: it hotlinks from jsDelivr. |
| External links stable and embeddable | Yes, when pinned to a commit. jsDelivr serves commit-pinned files with `Cache-Control: public, max-age=31536000, immutable` and `Access-Control-Allow-Origin: *`, so the browser can fetch the JSON and show the images directly. |

**Provenance.** The dataset restructures [wrkout/exercises.json](https://github.com/wrkout/exercises.json), which is also under the Unlicense and also describes itself as public domain. Neither repository documents where the images were first created. FitIQ accepts that small risk because it only links to the images and doesn't republish them. If a rights question ever comes up, image display can be turned off in one place (`catalogImageUrl` in `src/lib/data/catalog.ts`) without touching any user data.

### What the app loads

The commit is pinned in one constant, `CATALOG_COMMIT` in `src/lib/data/catalog.ts`:

- **Pinned commit:** `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5` (2026-09-27, the latest on `main` when checked)
- **Catalog JSON:** `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@<commit>/dist/exercises.json`. That's 876 exercises, about 1 MB uncompressed, fetched once and then served from the browser cache.
- **Images:** `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@<commit>/exercises/<image path from the JSON>`. That's one or two JPEGs per exercise, about 70 KB each, lazy-loaded. Three exercises have none, and the app marks them "No images".

**IDs.** Exercise IDs are the dataset's folder names, such as `Barbell_Squat`. Plans and sessions store them as `catalog_exercise_id`, and pinning the commit means they never change under us.

**Updating the pin** is a deliberate change: bump `CATALOG_COMMIT` and check that no exercise ID used in saved plans or sessions has disappeared. Sessions copy the exercise name, so history still reads correctly even if one has.

### How FitIQ maps the fields

| Dataset field | FitIQ |
| --- | --- |
| `primaryMuscles`, `secondaryMuscles` | Muscle filter (matches either list) |
| `equipment` | Equipment filter |
| `category` (strength, stretching, cardio, plyometrics, ...) | "Movement type" filter |
| `level` (beginner, intermediate, expert) | Difficulty filter |
| `force`, `mechanic` | Shown on the detail screen |
| `instructions` | Numbered steps on the detail screen |

Custom exercises use the same vocabularies, and they're enforced by CHECK constraints in the `custom_exercises` migration.

## Not chosen

- **RepDB** ([repdb.co](https://repdb.co)): the free tier requires visible attribution and forbids republishing the data or anything derived from it, and the larger tiers are paid and proprietary. A public repo and a $0 budget rule it out.
- **MuscleWiki:** reference only. Don't copy or redistribute its content.

## Screenshots in this repo

`docs/screenshots/` contains exercise photos from Free Exercise DB as part of app screenshots. That's redistribution, which the Unlicense allows (public domain). Everything else in the screenshots is the made-up demo account.
