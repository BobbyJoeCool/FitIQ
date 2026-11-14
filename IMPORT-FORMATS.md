# Import formats

FitIQ can import data from JSON files. This page explains every file type it accepts, for anyone writing one by hand or asking an AI assistant to write one.

## Import types

| Type | `format` value | Current version | Import from | Export from | Section |
| --- | --- | --- | --- | --- | --- |
| Workout plan | `fitiq-plan` | 2 | **Plans → Import a plan** | A plan's **Share as file** | [Plan files](#plan-files) |

That's the full list today. Workouts, weigh-ins, measurements, and cardio can be downloaded as CSV from **Settings → Download your data**, but those files are for spreadsheets and can't be imported. When a new import type is added, it gets a row in this table and its own section below.

## Rules for every FitIQ file

These hold for every import type, so a new type works the same way:

- **A header names the type and version.** Every file is a JSON object with a `format` string (such as `"fitiq-plan"`) and a whole-number `version`. A file with the wrong `format` is refused. A file from an older version still imports. A file from a newer version than the app knows is refused with a message to refresh the app.
- **You see a preview first.** Nothing is saved until you confirm, and an import only adds new records to your own account. It never changes or replaces something you already have, so importing the same file twice gives two copies.
- **Files are checked like anything you type in the app.** Every value goes through the same validation as the matching form. A file that breaks a rule is refused with a message naming what's wrong, so a file can't create something the app couldn't.
- **Unknown fields are ignored**, so a file can carry extra notes for people. Missing optional fields get their usual defaults.
- **No database IDs, accounts, or dates are trusted from the file.** Exported files hold only the content (for a plan, the routine), never account IDs, row IDs, or history. The only IDs a file may use are public catalog IDs, such as Free Exercise DB exercise IDs.
- **Files are untrusted data.** They're read as JSON only, never run, and their text is shown as plain text. There's a size limit per type, and files that aren't JSON are refused.
- **File names** end in `.fitiq-<type>.json`, e.g. `push-day.fitiq-plan.json`. The app reads any `.json` file; the name is only a convenience.

## Plan files

A plan file is a workout plan saved as JSON, so it can be shared with someone else or written outside the app and imported (FV-15, release 1.3.0). Version 2 (release 1.5.0) adds the default rest.

- **Export:** open a plan and tap **Share as file**. The download is named after the plan, e.g. `push-day.fitiq-plan.json`.
- **Import:** **Plans → Import a plan**, then pick the file. You see a preview first; **Import plan** adds it as a new plan of your own.
- **Machine-readable description:** [`public/plan.schema.json`](public/plan.schema.json) (JSON Schema, draft 2020-12), served by the app at `/FitIQ/plan.schema.json`.

### Plan example

```json
{
  "format": "fitiq-plan",
  "version": 2,
  "name": "Lower body A",
  "description": "Squat focus, about 45 minutes.",
  "defaultRestSeconds": 90,
  "exercises": [
    { "catalogId": "Barbell_Squat", "name": "Barbell Squat", "sets": 4, "reps": "5", "restSeconds": 180 },
    { "catalogId": "Romanian_Deadlift", "name": "Romanian Deadlift", "sets": 3, "reps": "8-10", "restOffsetSeconds": 30 },
    { "catalogId": "Plank", "name": "Plank", "sets": 3, "seconds": 45 },
    { "catalogId": "Hamstring_Stretch", "name": "Hamstring Stretch", "sets": 1, "seconds": 30, "perSide": true },
    {
      "custom": { "name": "Sled Push", "primaryMuscles": ["quadriceps"], "secondaryMuscles": ["glutes"], "equipment": "other" },
      "sets": 3,
      "notes": "20 m each"
    }
  ]
}
```

The smallest file that imports needs only the header, a name, and exercise IDs:

```json
{ "format": "fitiq-plan", "version": 2, "name": "Quick", "exercises": [{ "catalogId": "Pushups" }] }
```

### Plan top level

| Field | Required | What it is |
| --- | --- | --- |
| `format` | yes | Always `"fitiq-plan"`. |
| `version` | yes | `2`, or `1` for files from before the default rest (they still import). |
| `name` | yes | The plan name, 1 to 80 characters. |
| `description` | no | Up to 1000 characters. |
| `defaultRestSeconds` | no | The plan's default rest between sets, 0 to 3600 seconds. Left out, exercises that follow the default use the importer's Settings default. Version 2. |
| `exercises` | yes | 1 to 100 exercises, in plan order. |

### Each plan exercise

Each exercise has **either** `catalogId` **or** `custom`, never both.

| Field | What it is |
| --- | --- |
| `catalogId` | A [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) ID, such as `Barbell_Squat`. FitIQ uses the dataset at a pinned commit (`CATALOG_COMMIT` in `src/lib/data/catalog.ts`); the IDs are the `id` fields in its `dist/exercises.json`. An ID the app doesn't have is shown in the preview and skipped. |
| `name` | The exercise's name, for people reading the file. Ignored on import for catalog exercises, which take their name from the library. |
| `custom` | An exercise that isn't in the catalog (see below). |
| `sets` | Target sets, 1 to 20. |
| `reps` | Target reps as text or a number, up to 20 characters: `"8-12"`, `"10"`, `"AMRAP"`. With `releaseSeconds`, the number of holds. |
| `seconds` | Hold or work time per set, 1 to 600 (10 minutes). Turns on the hold timer. A longer block, like a 20-minute walk, has to be split into sets for now (see FV-10 in [`docs/future-versions.md`](docs/future-versions.md)). |
| `releaseSeconds` | Break between repeated holds within a set (hold, release, hold), 1 to 600. Needs `seconds`. |
| `perSide` | `true` when the target applies to each side. Default `false`. |
| `restSeconds` | A set rest after each set, 0 to 3600, whatever the default is. |
| `restOffsetSeconds` | Rest this much more than the default (negative for less), −3600 to 3600; the result never goes below 0. Version 2. |
| `notes` | Up to 500 characters. |

Leave out any target you don't want, or set it to `null`. Use `restSeconds` or `restOffsetSeconds`, not both; with neither, the exercise follows the default rest (the plan's `defaultRestSeconds`, else the importer's Settings default, else none).

### Custom exercises in a plan

A `custom` object copies an exercise that isn't in the catalog. On import it matches one of your own custom exercises with the same name (ignoring case and surrounding spaces). If you have none by that name, a new custom exercise is added to your library. The preview says which.

| Field | Required | What it is |
| --- | --- | --- |
| `name` | yes | 1 to 80 characters. |
| `primaryMuscles` | yes | At least one of: abdominals, abductors, adductors, biceps, calves, chest, forearms, glutes, hamstrings, lats, lower back, middle back, neck, quadriceps, shoulders, traps, triceps. |
| `secondaryMuscles` | no | From the same list. |
| `equipment` | no | One of: bands, barbell, body only, cable, dumbbell, e-z curl bar, exercise ball, foam roll, kettlebells, machine, medicine ball, other. |
| `difficulty` | no | beginner, intermediate, or expert. |
| `movementType` | no | cardio, olympic weightlifting, plyometrics, powerlifting, strength, stretching, or strongman. |
| `description` | no | Up to 2000 characters. |
| `videoUrl` | no | A full `https://` link to a demo video, up to 500 characters. |
| `videoSourceName` | no | Who made the video, up to 80 characters. |

### Plan import limits

- Files over 200 KB are refused.
- Every exercise is checked with the plan builder's rules; a file that breaks one is refused, naming the exercise and the problem.

### Writing a plan with an AI assistant

Give the assistant this page (or `plan.schema.json`) and describe the plan you want. Ask it to use only real Free Exercise DB IDs, which it can check against `dist/exercises.json` in that repository; anything it gets wrong shows up in the preview as skipped, so nothing broken is saved.
