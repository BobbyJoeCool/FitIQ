# Plan file format

A FitIQ plan file is a workout plan saved as JSON, so it can be shared with someone else or written outside the app and imported (FV-15, release 1.3.0). This page is for anyone writing one by hand, or asking an AI assistant to write one.

- **Export:** open a plan and tap **Share as file**. The download is named after the plan, e.g. `push-day.fitiq-plan.json`.
- **Import:** **Plans → Import a plan**, then pick the file. You see a preview first; **Import plan** adds it as a new plan of your own. Nothing you already have changes, so importing the same file twice gives two plans.
- **Machine-readable description:** [`public/plan.schema.json`](../public/plan.schema.json) (JSON Schema, draft 2020-12), served by the app at `/FitIQ/plan.schema.json`.

## Example

```json
{
  "format": "fitiq-plan",
  "version": 1,
  "name": "Lower body A",
  "description": "Squat focus, about 45 minutes.",
  "exercises": [
    { "catalogId": "Barbell_Squat", "name": "Barbell Squat", "sets": 4, "reps": "5", "restSeconds": 180 },
    { "catalogId": "Romanian_Deadlift", "name": "Romanian Deadlift", "sets": 3, "reps": "8-10", "restSeconds": 120 },
    { "catalogId": "Plank", "name": "Plank", "sets": 3, "seconds": 45, "restSeconds": 60 },
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
{ "format": "fitiq-plan", "version": 1, "name": "Quick", "exercises": [{ "catalogId": "Pushups" }] }
```

## Top level

| Field | Required | What it is |
| --- | --- | --- |
| `format` | yes | Always `"fitiq-plan"`. |
| `version` | yes | `1`. A newer version than the app knows is refused with a message to refresh the app. |
| `name` | yes | The plan name, 1 to 80 characters. |
| `description` | no | Up to 1000 characters. |
| `exercises` | yes | 1 to 100 exercises, in plan order. |

## Each exercise

Each exercise has **either** `catalogId` **or** `custom`, never both.

| Field | What it is |
| --- | --- |
| `catalogId` | A [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) ID, such as `Barbell_Squat`. FitIQ uses the dataset at a pinned commit (`CATALOG_COMMIT` in `src/lib/data/catalog.ts`); the IDs are the `id` fields in its `dist/exercises.json`. An ID the app doesn't have is shown in the preview and skipped. |
| `name` | The exercise's name, for people reading the file. Ignored on import for catalog exercises, which take their name from the library. |
| `custom` | An exercise that isn't in the catalog (see below). |
| `sets` | Target sets, 1 to 20. |
| `reps` | Target reps as text or a number, up to 20 characters: `"8-12"`, `"10"`, `"AMRAP"`. With `releaseSeconds`, the number of holds. |
| `seconds` | Hold or work time per set, 1 to 600. Turns on the hold timer. |
| `releaseSeconds` | Break between repeated holds within a set (hold, release, hold), 1 to 600. Needs `seconds`. |
| `perSide` | `true` when the target applies to each side. Default `false`. |
| `restSeconds` | Rest after each set, 0 to 3600. |
| `notes` | Up to 500 characters. |

Leave out any target you don't want, or set it to `null`.

## Custom exercises

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

## Rules on import

- Every exercise is checked with the same rules as the plan builder; a file that breaks one is refused, naming the exercise and the problem.
- Files over 200 KB, files that aren't JSON, and JSON that isn't a FitIQ plan are refused with a message.
- Fields the app doesn't know are ignored, so files can carry extra notes for people.
- Exported files hold only the routine: no account, plan or exercise IDs from the database, no dates, and no workout history.

## Writing one with an AI assistant

Give the assistant this page (or `plan.schema.json`) and describe the plan you want. Ask it to use only real Free Exercise DB IDs, which it can check against `dist/exercises.json` in that repository; anything it gets wrong shows up in the preview as skipped, so nothing broken is saved.
