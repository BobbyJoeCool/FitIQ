# Future versions

Upgrades planned or wanted after the v1 build plan. It's a log, not a commitment: each entry says what it is, why, what it depends on, and its status. When one is scheduled, it gets a build step and a GitHub issue, and its status here links to them.

v1 itself is `docs/build-plan.md`. The v1 non-goals are in plan.md section 2.

## How to add an entry

Copy this block under **Upgrades**, give it the next number, and add a row to the index.

```markdown
### FV-N. Short name

- **Status:** Idea | Proposed | Scheduled (issue #) | Done (PR #)
- **Why:** the problem it solves, for whom
- **What:** the change, in a few bullets
- **Depends on:** steps, other entries, or none
- **Data and security:** schema changes, RLS, anything that touches privacy (or "none")
- **Source:** where it came from (plan.md section, ADR, issue, request)
```

## Index

| # | Upgrade | Status | Depends on |
| --- | --- | --- | --- |
| FV-1 | [Stretching: a starter stretching plan, and stretch-aware plans](#fv-1-stretching) | Items 1–4 scheduled as step 4.4 (#56); item 5 still an idea | Phase 4 (done); hold timer needs Phase 5 |
| FV-2 | [Offline workout logging with sync](#fv-2-offline-workout-logging-with-sync) | Idea | Phase 5, Phase 7 PWA |
| FV-3 | [Move the backend to the home server](#fv-3-move-the-backend-to-the-home-server) | Idea | v1 done |
| FV-4 | [Opt-in family sharing and challenges](#fv-4-opt-in-family-sharing-and-challenges) | Idea | v1 done |
| FV-5 | [Import the exercise catalog into Postgres](#fv-5-import-the-exercise-catalog-into-postgres) | Idea | None |
| FV-6 | [Delete plans that no workout uses](#fv-6-delete-plans-that-no-workout-uses) | Done in 1.4.0 (#76) | Phase 5 sessions |
| FV-7 | [Programs: training by day, by rotation or weekly schedule](#fv-7-programs-training-by-day-by-rotation-or-weekly-schedule) | Proposed | Phase 4 (done); best before Phase 5 and 6.5 |
| FV-9 | [Email sender on bobbyjoecool.dev](#fv-9-email-sender-on-bobbyjoecooldev) | Proposed | None |
| FV-10 | [Cardio in workout plans](#fv-10-cardio-in-workout-plans) | Proposed | Phases 4, 5 and 7 (done) |
| FV-11 | [Default rest, with per-exercise overrides](#fv-11-default-rest-with-per-exercise-overrides) | Done in 1.5.0 (#77) | Phases 4 and 5 (done) |
| FV-12 | [Hold at the top, with a 3-second default release](#fv-12-hold-at-the-top-with-a-3-second-default-release) | Proposed | 1.1.0 repeated holds (done) |
| FV-13 | [Save workout edits back to the plan](#fv-13-save-workout-edits-back-to-the-plan) | Proposed | Phases 4 and 5 (done) |
| FV-14 | [Sound and voice cues for the hold timer](#fv-14-sound-and-voice-cues-for-the-hold-timer) | Done in 1.2.0 (#74) | 1.1.0 hold timer (done) |
| FV-15 | [Share plans as JSON files: export and import](#fv-15-share-plans-as-json-files-export-and-import) | Done in 1.3.0 (#75) | Phase 4 (done) |
| FV-16 | [Body composition measurements, and choosing what you track](#fv-16-body-composition-measurements-and-choosing-what-you-track) | Proposed | Phase 6 measurements (done) |
| FV-8 | [Not planned: nutrition, wearables, AI plans, native apps](#fv-8-not-planned) | Not planned | None |

## Upgrades

### FV-1. Stretching

- **Status:** Items 1 to 4 scheduled as step 4.4 (#56), 2026-11-09: starter plan, picker filter and hold targets in the `stretching` branch; the hold timer with Phase 5. Item 5 is still an idea.
- **Why:** stretching and mobility work should be as easy to follow as a lifting plan: a ready-made routine to start from, and targets that fit holds rather than reps.
- **Source:** Bob, 2026-11-09.

**What already works (no upgrade needed).** All 123 stretches in Free Exercise DB are already in the app, because the whole catalog loads at runtime. Exercises → **Movement type: Stretching** lists them, each with images and steps. Any stretch can go into a plan today, and its Reps target can hold text like `30 s each side`.

**What's missing:**

1. **Starter stretching plan.** A **Use a starter plan** option on the Plans screen (in the empty state and next to **New plan**) that copies a ready-made routine into your own plans. You can then edit it freely, and it stays private like any other plan.
   - The template lives in code as a list of catalog IDs and targets (for example `src/features/workout-plans/starterPlans.ts`), so there's **no schema change** and nothing shared in the database.
   - A unit test checks that every template ID exists in the pinned catalog commit. Bumping `CATALOG_COMMIT` then can't silently break the template.
   - The same mechanism can hold other starters later (for example a beginner full-body plan).
2. **Movement type filter in the plan picker.** The picker (`/plans/:id/add`) only filters by muscle and equipment. Adding the library's **Movement type** filter makes it quick to build your own stretching plan.
3. **Hold targets.** Stretches are held for time, often on each side. Free text in Reps works for now. A structured version would add `target_seconds` and `per_side` to `workout_plan_exercises`, so the summary reads "2 × 30 s each side" and Phase 5 can run a timer.
   - **Data and security:** one migration adding two nullable columns with CHECKs (seconds 1–600). RLS is unchanged, since the table is already owner-only.
4. **Hold timer during a workout.** In the active workout (Phase 5), a countdown for timed targets, with a "switch sides" cue for per-side holds. It needs item 3.
5. **Kind of stretch.** The catalog mixes static holds, dynamic warm-ups (circles, leg swings) and foam rolling ("SMR"), all as `stretching`. A curated tag would allow "Warm-up" and "Cool-down" starters. A first rough split, by name, is in the reference table below.

- **Depends on:** Phase 4 (done) for items 1 and 2. Item 3 is a migration, best done with or after 2.5 (#14). Item 4 needs Phase 5.

**Proposed starter plan: "Full-body stretch"**

Beginner level, no equipment, about 12 minutes. Every exercise is a static hold from the pinned catalog. Targets: 1 set, Reps `30 s each side` (or `30 s` for both-sides stretches), Rest 0. Order runs from the top of the body down, then the floor work.

| # | Stretch | Catalog ID | Area | Target |
| --- | --- | --- | --- | --- |
| 1 | Side Neck Stretch | `Side_Neck_Stretch` | Neck | 30 s each side |
| 2 | Elbows Back | `Elbows_Back` | Chest | 30 s |
| 3 | Shoulder Stretch | `Shoulder_Stretch` | Shoulders | 30 s each side |
| 4 | Triceps Stretch | `Triceps_Stretch` | Triceps | 30 s each side |
| 5 | Upper Back Stretch | `Upper_Back_Stretch` | Middle back | 30 s |
| 6 | Standing Lateral Stretch | `Standing_Lateral_Stretch` | Sides (abdominals) | 30 s each side |
| 7 | Calf Stretch Hands Against Wall | `Calf_Stretch_Hands_Against_Wall` | Calves | 30 s each side |
| 8 | Kneeling Hip Flexor | `Kneeling_Hip_Flexor` | Hip flexors (quadriceps) | 30 s each side |
| 9 | On Your Side Quad Stretch | `On_Your_Side_Quad_Stretch` | Quadriceps | 30 s each side |
| 10 | Hamstring Stretch | `Hamstring_Stretch` | Hamstrings | 30 s each side |
| 11 | Knee Across The Body | `Knee_Across_The_Body` | Glutes | 30 s each side |
| 12 | Side Lying Groin Stretch | `Side_Lying_Groin_Stretch` | Adductors | 30 s each side |
| 13 | Cat Stretch | `Cat_Stretch` | Lower back | 30 s |
| 14 | Child's Pose | `Childs_Pose` | Lower back | 30 s |

Bob can swap stretches before this is built. The only rule is that IDs must come from the reference table below.

<details>
<summary><strong>Reference: all 123 stretches in the pinned catalog</strong> (commit <code>f00c92c</code>)</summary>

All have images. Levels: 82 beginner, 29 intermediate, 12 expert. **Kind** is a rough first split by name (85 static holds, 24 dynamic, 14 foam rolling); check it before relying on it.

| Muscle | Stretch | ID | Kind | Level |
| --- | --- | --- | --- | --- |
| Abdominals | Lower Back Curl | `Lower_Back_Curl` | Static hold | Beginner |
| Abdominals | Overhead Stretch | `Overhead_Stretch` | Static hold | Beginner |
| Abdominals | Scissor Kick | `Scissor_Kick` | Dynamic | Beginner |
| Abdominals | Seated Overhead Stretch | `Seated_Overhead_Stretch` | Static hold | Beginner |
| Abdominals | Standing Lateral Stretch | `Standing_Lateral_Stretch` | Static hold | Beginner |
| Abdominals | Stomach Vacuum | `Stomach_Vacuum` | Static hold | Beginner |
| Abdominals | Toe Touchers | `Toe_Touchers` | Dynamic | Beginner |
| Abdominals | Torso Rotation | `Torso_Rotation` | Static hold | Beginner |
| Abductors | Hip Circles (prone) | `Hip_Circles_prone` | Dynamic | Beginner |
| Abductors | IT Band and Glute Stretch | `IT_Band_and_Glute_Stretch` | Static hold | Intermediate |
| Abductors | Iliotibial Tract-SMR | `Iliotibial_Tract-SMR` | Foam rolling | Intermediate |
| Abductors | Lying Crossover | `Lying_Crossover` | Static hold | Expert |
| Abductors | Standing Hip Circles | `Standing_Hip_Circles` | Dynamic | Beginner |
| Abductors | Windmills | `Windmills` | Dynamic | Intermediate |
| Adductors | Adductor | `Adductor` | Foam rolling | Intermediate |
| Adductors | Adductor/Groin | `Adductor_Groin` | Static hold | Intermediate |
| Adductors | Groin and Back Stretch | `Groin_and_Back_Stretch` | Static hold | Intermediate |
| Adductors | Groiners | `Groiners` | Dynamic | Intermediate |
| Adductors | Lying Bent Leg Groin | `Lying_Bent_Leg_Groin` | Static hold | Expert |
| Adductors | Side Leg Raises | `Side_Leg_Raises` | Dynamic | Beginner |
| Adductors | Side Lying Groin Stretch | `Side_Lying_Groin_Stretch` | Static hold | Beginner |
| Biceps | Brachialis-SMR | `Brachialis-SMR` | Foam rolling | Intermediate |
| Biceps | Seated Biceps | `Seated_Biceps` | Static hold | Expert |
| Biceps | Standing Biceps Stretch | `Standing_Biceps_Stretch` | Static hold | Beginner |
| Calves | Ankle Circles | `Ankle_Circles` | Dynamic | Beginner |
| Calves | Anterior Tibialis-SMR | `Anterior_Tibialis-SMR` | Foam rolling | Intermediate |
| Calves | Calf Stretch Elbows Against Wall | `Calf_Stretch_Elbows_Against_Wall` | Static hold | Beginner |
| Calves | Calf Stretch Hands Against Wall | `Calf_Stretch_Hands_Against_Wall` | Static hold | Beginner |
| Calves | Calves-SMR | `Calves-SMR` | Foam rolling | Intermediate |
| Calves | Foot-SMR | `Foot-SMR` | Foam rolling | Intermediate |
| Calves | Knee Circles | `Knee_Circles` | Dynamic | Beginner |
| Calves | Peroneals Stretch | `Peroneals_Stretch` | Static hold | Intermediate |
| Calves | Peroneals-SMR | `Peroneals-SMR` | Foam rolling | Intermediate |
| Calves | Posterior Tibialis Stretch | `Posterior_Tibialis_Stretch` | Static hold | Intermediate |
| Calves | Seated Calf Stretch | `Seated_Calf_Stretch` | Static hold | Beginner |
| Calves | Standing Gastrocnemius Calf Stretch | `Standing_Gastrocnemius_Calf_Stretch` | Static hold | Beginner |
| Calves | Standing Soleus And Achilles Stretch | `Standing_Soleus_And_Achilles_Stretch` | Static hold | Beginner |
| Chest | Behind Head Chest Stretch | `Behind_Head_Chest_Stretch` | Static hold | Expert |
| Chest | Chest And Front Of Shoulder Stretch | `Chest_And_Front_Of_Shoulder_Stretch` | Static hold | Beginner |
| Chest | Chest Stretch on Stability Ball | `Chest_Stretch_on_Stability_Ball` | Static hold | Beginner |
| Chest | Dynamic Chest Stretch | `Dynamic_Chest_Stretch` | Dynamic | Beginner |
| Chest | Elbows Back | `Elbows_Back` | Static hold | Beginner |
| Forearms | Kneeling Forearm Stretch | `Kneeling_Forearm_Stretch` | Static hold | Beginner |
| Forearms | Wrist Circles | `Wrist_Circles` | Dynamic | Beginner |
| Glutes | Ankle On The Knee | `Ankle_On_The_Knee` | Static hold | Beginner |
| Glutes | Knee Across The Body | `Knee_Across_The_Body` | Static hold | Beginner |
| Glutes | Lying Glute | `Lying_Glute` | Static hold | Expert |
| Glutes | One Knee To Chest | `One_Knee_To_Chest` | Static hold | Beginner |
| Glutes | Piriformis-SMR | `Piriformis-SMR` | Foam rolling | Intermediate |
| Glutes | Seated Glute | `Seated_Glute` | Static hold | Expert |
| Hamstrings | 90/90 Hamstring | `90_90_Hamstring` | Static hold | Beginner |
| Hamstrings | Chair Leg Extended Stretch | `Chair_Leg_Extended_Stretch` | Static hold | Beginner |
| Hamstrings | Front Leg Raises | `Front_Leg_Raises` | Dynamic | Beginner |
| Hamstrings | Hamstring Stretch | `Hamstring_Stretch` | Static hold | Beginner |
| Hamstrings | Hamstring-SMR | `Hamstring-SMR` | Foam rolling | Beginner |
| Hamstrings | Inchworm | `Inchworm` | Dynamic | Beginner |
| Hamstrings | Intermediate Groin Stretch | `Intermediate_Groin_Stretch` | Static hold | Intermediate |
| Hamstrings | Leg-Up Hamstring Stretch | `Leg-Up_Hamstring_Stretch` | Static hold | Beginner |
| Hamstrings | Lying Hamstring | `Lying_Hamstring` | Static hold | Expert |
| Hamstrings | Runner's Stretch | `Runners_Stretch` | Static hold | Beginner |
| Hamstrings | Seated Floor Hamstring Stretch | `Seated_Floor_Hamstring_Stretch` | Static hold | Beginner |
| Hamstrings | Seated Hamstring | `Seated_Hamstring` | Static hold | Expert |
| Hamstrings | Seated Hamstring and Calf Stretch | `Seated_Hamstring_and_Calf_Stretch` | Static hold | Intermediate |
| Hamstrings | Split Squats | `Split_Squats` | Dynamic | Intermediate |
| Hamstrings | Standing Hamstring and Calf Stretch | `Standing_Hamstring_and_Calf_Stretch` | Static hold | Beginner |
| Hamstrings | Standing Toe Touches | `Standing_Toe_Touches` | Static hold | Beginner |
| Hamstrings | The Straddle | `The_Straddle` | Static hold | Beginner |
| Hamstrings | Upper Back-Leg Grab | `Upper_Back-Leg_Grab` | Static hold | Beginner |
| Hamstrings | World's Greatest Stretch | `Worlds_Greatest_Stretch` | Static hold | Intermediate |
| Lats | Chair Lower Back Stretch | `Chair_Lower_Back_Stretch` | Static hold | Beginner |
| Lats | Dynamic Back Stretch | `Dynamic_Back_Stretch` | Dynamic | Beginner |
| Lats | Latissimus Dorsi-SMR | `Latissimus_Dorsi-SMR` | Foam rolling | Beginner |
| Lats | One Arm Against Wall | `One_Arm_Against_Wall` | Static hold | Beginner |
| Lats | One Handed Hang | `One_Handed_Hang` | Static hold | Beginner |
| Lats | Overhead Lat | `Overhead_Lat` | Static hold | Expert |
| Lats | Side-Lying Floor Stretch | `Side-Lying_Floor_Stretch` | Static hold | Beginner |
| Lower back | Cat Stretch | `Cat_Stretch` | Static hold | Beginner |
| Lower back | Child's Pose | `Childs_Pose` | Static hold | Beginner |
| Lower back | Crossover Reverse Lunge | `Crossover_Reverse_Lunge` | Dynamic | Intermediate |
| Lower back | Dancer's Stretch | `Dancers_Stretch` | Static hold | Beginner |
| Lower back | Hug A Ball | `Hug_A_Ball` | Static hold | Beginner |
| Lower back | Hug Knees To Chest | `Hug_Knees_To_Chest` | Static hold | Beginner |
| Lower back | Lower Back-SMR | `Lower_Back-SMR` | Foam rolling | Beginner |
| Lower back | Pelvic Tilt Into Bridge | `Pelvic_Tilt_Into_Bridge` | Static hold | Intermediate |
| Lower back | Pyramid | `Pyramid` | Static hold | Beginner |
| Lower back | Standing Pelvic Tilt | `Standing_Pelvic_Tilt` | Static hold | Beginner |
| Lower back | Superman | `Superman` | Dynamic | Beginner |
| Middle back | Middle Back Stretch | `Middle_Back_Stretch` | Static hold | Beginner |
| Middle back | Rhomboids-SMR | `Rhomboids-SMR` | Foam rolling | Intermediate |
| Middle back | Spinal Stretch | `Spinal_Stretch` | Static hold | Beginner |
| Middle back | Upper Back Stretch | `Upper_Back_Stretch` | Static hold | Beginner |
| Neck | Chin To Chest Stretch | `Chin_To_Chest_Stretch` | Static hold | Beginner |
| Neck | Neck-SMR | `Neck-SMR` | Foam rolling | Intermediate |
| Neck | Side Neck Stretch | `Side_Neck_Stretch` | Static hold | Beginner |
| Quadriceps | All Fours Quad Stretch | `All_Fours_Quad_Stretch` | Static hold | Intermediate |
| Quadriceps | Frog Hops | `Frog_Hops` | Dynamic | Intermediate |
| Quadriceps | Intermediate Hip Flexor and Quad Stretch | `Intermediate_Hip_Flexor_and_Quad_Stretch` | Static hold | Intermediate |
| Quadriceps | Iron Crosses (stretch) | `Iron_Crosses_stretch` | Dynamic | Intermediate |
| Quadriceps | Kneeling Hip Flexor | `Kneeling_Hip_Flexor` | Static hold | Beginner |
| Quadriceps | Looking At Ceiling | `Looking_At_Ceiling` | Static hold | Beginner |
| Quadriceps | Lying Prone Quadriceps | `Lying_Prone_Quadriceps` | Static hold | Expert |
| Quadriceps | On Your Side Quad Stretch | `On_Your_Side_Quad_Stretch` | Static hold | Beginner |
| Quadriceps | On-Your-Back Quad Stretch | `On-Your-Back_Quad_Stretch` | Static hold | Beginner |
| Quadriceps | One Half Locust | `One_Half_Locust` | Static hold | Beginner |
| Quadriceps | Quad Stretch | `Quad_Stretch` | Static hold | Intermediate |
| Quadriceps | Quadriceps-SMR | `Quadriceps-SMR` | Foam rolling | Intermediate |
| Quadriceps | Rear Leg Raises | `Rear_Leg_Raises` | Dynamic | Beginner |
| Quadriceps | Sit Squats | `Sit_Squats` | Dynamic | Beginner |
| Quadriceps | Standing Elevated Quad Stretch | `Standing_Elevated_Quad_Stretch` | Static hold | Beginner |
| Quadriceps | Standing Hip Flexors | `Standing_Hip_Flexors` | Static hold | Beginner |
| Shoulders | Arm Circles | `Arm_Circles` | Dynamic | Beginner |
| Shoulders | Chair Upper Body Stretch | `Chair_Upper_Body_Stretch` | Static hold | Beginner |
| Shoulders | Elbow Circles | `Elbow_Circles` | Dynamic | Beginner |
| Shoulders | Round The World Shoulder Stretch | `Round_The_World_Shoulder_Stretch` | Static hold | Beginner |
| Shoulders | Seated Front Deltoid | `Seated_Front_Deltoid` | Static hold | Expert |
| Shoulders | Shoulder Circles | `Shoulder_Circles` | Dynamic | Beginner |
| Shoulders | Shoulder Raise | `Shoulder_Raise` | Static hold | Beginner |
| Shoulders | Shoulder Stretch | `Shoulder_Stretch` | Static hold | Beginner |
| Shoulders | Side Wrist Pull | `Side_Wrist_Pull` | Static hold | Beginner |
| Shoulders | Upward Stretch | `Upward_Stretch` | Static hold | Beginner |
| Triceps | Overhead Triceps | `Overhead_Triceps` | Static hold | Expert |
| Triceps | Tricep Side Stretch | `Tricep_Side_Stretch` | Static hold | Beginner |
| Triceps | Triceps Stretch | `Triceps_Stretch` | Static hold | Beginner |

</details>

### FV-2. Offline workout logging with sync

- **Status:** Idea
- **Why:** gyms and basements have bad signal. v1 blocks saves offline with a clear banner rather than losing data (plan.md section 10).
- **What:** a local queue for completed sets, retry with backoff, and conflict handling, then sync when back online.
- **Depends on:** Phase 5 (active workout), Phase 7 (PWA service worker).
- **Data and security:** queued data sits on the device until it syncs. That needs care on shared devices: clear it on sign-out.
- **Source:** plan.md sections 2, 10 and 15.

### FV-3. Move the backend to the home server

- **Status:** Idea
- **Why:** own the data and drop the Supabase free-tier limits (pausing, quotas).
- **What:** Auth and Postgres move to the home MacBook server; the frontend stays on GitHub Pages and only the two `VITE_SUPABASE_*` values change. It needs a public HTTPS hostname (for example `api.bobbyjoecool.dev`) through a tunnel or reverse proxy, patching, and backups.
- **Depends on:** v1 done. It's helped by v1's rule against Supabase-only features (no Edge Functions, Storage or Realtime).
- **Data and security:** the server becomes internet-facing, so it needs a backup and restore drill (8.4, 8.5) first.
- **Source:** plan.md sections 1, 5 and 15; build-plan decisions.

### FV-4. Opt-in family sharing and challenges

- **Status:** Idea
- **Why:** the household may want to see each other's progress or run a challenge.
- **What:** each person chooses exactly what to share and with whom. Challenges come later.
- **Depends on:** v1 done.
- **Data and security:** needs its own RLS design (plan.md section 6). v1 policies are strictly owner-only, so sharing must be added deliberately and covered by the RLS test.
- **Source:** plan.md sections 1, 6 and 15; section 17 answer 0.2.

### FV-5. Import the exercise catalog into Postgres

- **Status:** Idea
- **Why:** edit or extend catalog exercises, or stop depending on jsDelivr.
- **What:** an import script for the pinned dataset into a read-only `catalog_exercises` table. Plans keep using `catalog_exercise_id`, so nothing saved changes.
- **Depends on:** none.
- **Data and security:** a shared read-only table, readable by any signed-in user, with no user data in it.
- **Source:** plan.md sections 7 and 15.

### FV-6. Delete plans that no workout uses

- **Status:** Done in 1.4.0 (issue #76). Migration `20261112000000_delete_unused_plans.sql`; ADR 0001 amended.
- **Why:** plans made by mistake can only be archived (ADR 0001).
- **What:** a Delete button, only for plans that no session references; anything else stays archive-only.
- **Depends on:** Phase 5 (sessions reference plans).
- **Data and security:** a delete policy limited to unreferenced plans, plus an RLS test case. ADR 0001 needs updating.
- **Source:** `docs/adr/0001-delete-behavior.md`.

### FV-7. Programs: training by day, by rotation or weekly schedule

- **Status:** Proposed (requested 2026-11-09)
- **Why:** people train in splits ("Day 1 Push, Day 2 Pull, Day 3 Legs"). Today each day is a separate plan, and the app doesn't know they belong together or which one is next. The dashboard step (6.5, #35) promises "today's planned workout", but nothing in plan.md or the data model defines how the app would know which that is. Programs fill that gap.
- **Source:** Bob, 2026-11-09.

**What:** a **program** is an ordered group of your existing plans, one per training day. When you create a program, you pick how it decides today's workout, and you can switch modes later:

| | **Rotation** | **Weekly schedule** |
| --- | --- | --- |
| Setup | Order the days: Day 1, Day 2, Day 3... The same plan can appear twice (A, B, A). Optional rest days in the cycle | Pin each plan to one or more weekdays (Push: Mon, Thu). Unpinned days are rest days |
| Today's workout | The day after the last one you **finished** from this program, wrapping from the last day back to Day 1. New programs start at Day 1 | Whatever is pinned to today's weekday (your phone's local time). A rest day says so, with "Start a different workout" |
| Missed a day | Nothing is lost: the next day waits for you | That day passes. The next pinned day is shown |
| Best for | Training when you can, 3 to 5 times a week, with no fixed days | Fixed days, such as a class schedule or set gym days |

Both modes:

- **One active program at a time.** The dashboard shows its next or today's workout with **Start Workout**. Other programs can be kept and switched to, and old ones archived.
- **"Do a different day" or "skip to next day"** is always available. Rotation can also be reset to Day 1.
- Starting from a program day is the same as starting from that plan (Phase 5.1). The session also records which program day it came from, so rotation knows where you are.
- Plans stay usable on their own. A plan can belong to several programs, or to none.
- **Without a program**, the dashboard falls back to the most recently used plan, plus "Start a workout".

**Data and security** (a sketch, to settle when it's scheduled):

- `programs`: id, user_id, name, `mode` (`rotation` | `weekly`), is_active, is_archived, timestamps. A partial unique index allows only one active program per user.
- `program_days`: id, user_id, program_id, plan_id (null for a rotation rest day), `position` (rotation order) or `weekdays` (smallint array, 0 to 6, for weekly), with CHECKs so each row matches its program's mode.
- `workout_sessions` gains a nullable `program_day_id` (set null if the day is removed), which is used to find "last finished day" for rotation.
- Owner-only RLS on both new tables. The ownership trigger pattern from `workout_plan_exercises` makes sure a program's days, and their plans, belong to the same user. The RLS test gets both tables and cross-parent checks. Delete behavior goes in ADR 0001: programs are archived; program days can be removed.
- Weekday is computed in the browser's local time zone, never on the server, so "today" matches the user's day.

**Screens:** a **Programs** section on the Plans screen (create, choose mode, order or pin days, set active), and the dashboard card from 6.5.

- **Depends on:** Phase 4 (done). The session link needs Phase 5's `workout_sessions` (2.5, #14). **Ideally decide before Phase 5.1 and 6.5**, since both touch how a workout is started and what "today's planned workout" means. If v1 ships without it, 6.5 should use the fallback above.

### FV-9. Email sender on bobbyjoecool.dev

- **Status:** Proposed (requested 2026-11-10)
- **Why:** Supabase's built-in email only reaches the Supabase team's own addresses, at 2 an hour, so v1 runs with no email (option A in `docs/accounts.md`): the owner creates each account with a temporary password and resets forgotten ones by hand. With a real sender, family members get an invite link and can reset their own password from the sign-in screen.
- **What:**
  - Send FitIQ's auth email from a `bobbyjoecool.dev` address (for example `fitiq@bobbyjoecool.dev`) through an SMTP provider with a free tier, such as Resend or Brevo.
  - DNS on `bobbyjoecool.dev`: the provider's SPF and DKIM records, plus a DMARC record, so the mail isn't marked as spam.
  - Supabase → Authentication → SMTP settings pointed at the provider. The invite and reset templates in `supabase/templates/` and the `/auth/confirm` flow already exist (step 2.4), so no app code changes are expected.
  - Update `docs/accounts.md` to make option B the default, and test invite, reset, and expired-link handling on the live site.
- **Depends on:** none. SMTP is a standard setting, so it carries over to a self-hosted backend (FV-3).
- **Data and security:** no schema change. The SMTP password lives only in the Supabase dashboard and the owner's password manager, never in the repo. Rate limits on reset emails stay on.
- **Source:** Bob, 2026-11-10.

### FV-10. Cardio in workout plans

- **Status:** Proposed (requested 2026-11-10)
- **Why:** a real session often mixes lifting and cardio, like a 10-minute walking pad warm-up before Leg Day or a bike finisher. Today cardio lives on its own Cardio tab. Catalog cardio exercises can go into a plan and are logged in the workout as time and distance sets, but the plan can't hold a cardio target, there's no walking pad preset or incline, and those sets never show up on the Cardio tab or in its weekly totals.
- **The 10-minute cap:** a timed set's Seconds tops out at 600 (`targetSecondsMax` in `src/lib/validation.ts`), so a longer cardio block doesn't fit in one set. A 20-minute walking pad warm-up today has to be written as two 10-minute sets with no rest between them, with a note explaining the split (as in the Day 1 to Day 4 plan files).
- **What:**
  - A plan can include a **cardio item**: an activity (walking pad, walk, run, bike, and so on, the same list as the Cardio tab) with target minutes, and optionally distance and incline. It sits in the plan's order like any exercise, so it can be a warm-up, in the middle, or a finisher.
  - **Target minutes have no 10-minute cap.** A cardio item takes its length in minutes, up to a sensible limit such as 180, so a 20-minute walk is one item with one timer and one entry, not two back-to-back sets.
  - In the workout, the cardio item shows its target and a timer, with the walking pad preset filling minutes, incline, and distance unit. Completing it saves one entry.
  - **Every exercise marked Cardio logs to the Cardio tab too**, not only plan cardio items. Any exercise whose movement type is cardio, from the catalog or your own custom exercises, in a plan or added mid-workout, saves a cardio entry when its sets are logged: total time and distance from the sets, and the workout's date. The exercise maps to a Cardio tab activity (walking pad, walk, run, cycle, elliptical, rowing, swim, hike), set on custom exercises and matched by name for catalog ones, and falls back to **Other**.
  - Several sets of the same cardio exercise in one workout, like two 10-minute walking blocks, make **one** cardio entry with their time and distance added up, not one per set.
  - Editing or deleting those sets in the workout updates or removes the cardio entry, so the two never disagree.
  - That entry counts everywhere cardio counts: the Cardio tab's history and weekly tiles, the dashboard's Recent cardio, and the cardio CSV, linked back to the workout it came from. It isn't counted twice.
  - The workout's finish review and detail page show the cardio item with its time and distance.
- **Depends on:** Phase 4 plans, Phase 5 workouts, Phase 7 cardio (all done).
- **Data and security** (a sketch, to settle when it's scheduled):
  - `workout_plan_exercises` gains a way to hold a cardio item and its targets (for example `cardio_activity`, `target_minutes`, `target_distance`, `target_incline`, with CHECKs that it's either an exercise or a cardio item). `target_minutes` gets its own range (for example 1 to 180), separate from the 600-second limit on timed sets, which stays for holds and stretches.
  - `cardio_sessions` gains a nullable `workout_session_id` (set null if the workout is deleted), so a cardio entry made in a workout is the single record, rather than a set plus a separate cardio row. With the "every Cardio exercise" rule it also needs the workout exercise it came from (`workout_session_exercise_id`, unique), so there's one entry per cardio exercise per workout and editing the sets can update it.
  - Custom exercises gain an optional `cardio_activity`, and catalog cardio exercises get a name-to-activity map in code (for example "Walking, Treadmill" to walk), with `other` as the fallback.
  - RLS is unchanged in shape, since both tables are owner-only. The ownership trigger must make sure the linked workout belongs to the same user, and the RLS test gets the cross-parent check. ADR 0001 notes what happens to the cardio entry when its workout is deleted.
- **Source:** Bob, 2026-11-10. The 10-minute cap was added 2026-11-13, from the 20-minute walking pad warm-up in Bob's plan files. "Every exercise marked Cardio logs to the Cardio tab" was added 2026-11-13.

### FV-11. Default rest, with per-exercise overrides

- **Status:** Done in 1.5.0 (issue #77). Built as sketched, with these choices: the Settings default starts off (blank), so nothing changes until it's set; the −/+ steppers move 15 s; an offset that would go below 0 rests 0; an offset with no default set gives no rest timer and the plan screen says so; exercises added mid-workout get the Settings default. Between exercises, the rest after an exercise's last set carries on when you tap Next, as before. Plan files moved to version 2 to carry the new fields.
- **Why:** today every plan exercise needs its own Rest (sec), typed one at a time, and an exercise with no rest set gets no rest timer at all. Most people rest about the same everywhere, with a few exceptions: longer after heavy squats, shorter for accessories.
- **What:**
  - A **default rest** in Settings (for example 90 s), used by any exercise that doesn't say otherwise, so the rest timer runs everywhere without setup. A plan can optionally set its own default that wins over the Settings one.
  - It also covers the gap **between exercises**: after the last set of an exercise, moving on with Next starts the same default rest unless the exercise says otherwise.
  - Each plan exercise's rest becomes one of three choices in Edit targets:
    - **Default:** use the plan's or the Settings default, and follow it if it changes later.
    - **Default ± seconds:** −/+ steppers adjust from the default (for example "Default + 30 s"), still following it if it changes.
    - **Set time:** a fixed number of seconds, as today. Existing plans keep their current rest values as set times, so nothing changes for them.
  - The plan screen shows the result, e.g. "Rest 2:00 (default + 30 s)".
- **Depends on:** Phases 4 and 5 (done).
- **Data and security** (a sketch, to settle when it's scheduled):
  - `profiles.default_rest_seconds` (nullable, 0–3600) and `workout_plans.default_rest_seconds` (nullable, overrides the profile).
  - `workout_plan_exercises` gains `rest_mode` (`default` | `offset` | `fixed`) and `rest_offset_seconds`. Existing rows become `fixed` with their current `rest_seconds`; rows with no rest become `default`.
  - When a workout starts, `start_workout` resolves the rest to plain seconds and copies it into `workout_session_exercises.rest_seconds`, as now, so changing a default later never changes past workouts.
  - No new tables. RLS is unchanged in shape, since profiles, plans and plan exercises are already owner-only.
- **Source:** Bob, 2026-11-10.

### FV-12. Hold at the top, with a 3-second default release

- **Status:** Proposed (requested 2026-11-10)
- **Why:** 1.1.0 added repeated holds (hold, release, repeat, #67), but the release time has to be typed for every exercise, and it's the only way to say the exercise has a hold at all. Most hold-at-the-top exercises (ab roller, glute bridge, a paused pull-up) use about the same short release to get back into position.
- **What:**
  - Edit targets gets a **Hold at the top of each rep** checkbox. Only exercises with it ticked use the repeated-hold timer and a release time. Every other exercise works as it does now, with no release.
  - When ticked, the release defaults to **3 seconds**. The Release (sec) field shows the default and can be changed per exercise to override it.
  - The timer and the set logging work as in 1.1.0: Reps holds of Hold seconds with the release between them, logged as reps.
  - Optional: make the 3-second default itself a setting in Settings, if 3 s doesn't suit everyone.
- **Depends on:** 1.1.0's repeated holds (done).
- **Data and security** (a sketch, to settle when it's scheduled):
  - `workout_plan_exercises` gains `hold_at_top boolean not null default false`, copied into `workout_session_exercises` by `start_workout`. A null `target_release_seconds` with `hold_at_top` set means "use the default", resolved to 3 s when the workout starts, so past workouts keep the release they used.
  - Existing rows with a release time become `hold_at_top = true`, so plans set up in 1.1.0 behave the same.
  - RLS unchanged: both tables are already owner-only.
- **Source:** Bob, 2026-11-10.

### FV-13. Save workout edits back to the plan

- **Status:** Proposed (requested 2026-11-10)
- **Why:** a workout copies its plan's targets when it starts, so changes made during the workout stay in that workout. If you find mid-workout that the hold should be 45 s, a stretch shouldn't be per side, or an exercise you added belongs in the plan, you have to remember to go and edit the plan afterwards.
- **What:**
  - During a workout, each exercise gets **Edit targets**, the same form as on the plan: sets, reps, rest, hold, release, each side, and notes. Today only the Each side toggle and the per-set fields can change mid-workout.
  - Every edit made during a workout offers **Also change the plan**, off by default. Without it, the change applies to this workout only, as today. With it, the same change is saved to the plan exercise the workout came from.
  - The Each side toggle and the Seconds field on a timed set offer the same choice, so a hold time that's changed mid-set can become the plan's new target.
  - An exercise added mid-workout offers **Add to the plan too**, which adds it at the end of the plan. Skipping an exercise doesn't change the plan.
  - Only the plan this workout started from can change. An empty workout (no plan) has no option, and past workouts are never changed.
- **Depends on:** Phases 4 and 5 (done).
- **Data and security** (a sketch, to settle when it's scheduled):
  - `workout_session_exercises` needs a link back to its plan exercise (a nullable `plan_exercise_id`, set null if the plan exercise is removed), set by `start_workout`, so an edit knows which plan row to update.
  - Session targets become editable: column `update` grants for the target columns on `workout_session_exercises`, which aren't granted today.
  - Saving to the plan is an ordinary update through `src/lib/data/plans.ts`, so RLS and the ownership triggers apply as they do now. The RLS test gets a case that a workout can't change another user's plan through the link.
- **Source:** Bob, 2026-11-10.

### FV-14. Sound and voice cues for the hold timer

- **Status:** Done in 1.2.0 (issue #74). Stretches say "Stretch", other exercises "Hold"; tones skip steps of 3 s or less so they don't talk over the voice. Voice and tones default to on.
- **Why:** during a stretch or a hold you're not looking at the screen. Today the timer only vibrates, and only on Android: iPhones ignore vibration, so an iPhone user gets no cue at all when a hold ends or it's time to switch sides.
- **What:**
  - **A soft 3, 2, 1 countdown** before each change: three short, quiet tones in the last three seconds of a hold, release, or switch pause. They're gentle sine tones with a slow fade in and out, not a beep or an alarm, and generated in the browser, so there are no audio files.
  - **Spoken cues** from the phone's built-in voice (the browser's text-to-speech), at a calm rate and moderate volume:
    - "Stretch" or "Hold" as a hold starts, and "First side" / "Second side" for per-side holds
    - "Release" between repeated holds (1.1.0, and FV-12), then "Hold" again
    - "Switch" at the switch-sides pause
    - "Two more", "Last one" near the end of repeated holds
    - "Done" at the end of the set
    - Optionally "Rest" and "Rest over" for the rest timer between sets
  - **Settings → Sound:** voice on or off, tones on or off, and a volume level. Saved per device rather than per account, since the right choice depends on the phone and where you're working out. Vibration stays where it's supported.
  - The cues follow the timer steps already built in `src/features/workout-sessions/timerSteps.ts`, so each step kind maps to a phrase.
- **Decided:** use the device's built-in voice, not recorded clips. It's free, works offline, and phrases can change without new recordings. It sounds a little different on iPhone and Android.
- **Things to check when it's built:**
  - iPhone Safari only allows sound after a tap, so tapping **Start timer** has to unlock audio and speech for the rest of the set.
  - Cues should mix with the user's own music rather than pause it, where the browser allows.
  - When the screen locks, the browser may pause sound; the workout screen already keeps the screen awake (`useWakeLock`) where the browser supports it, which should cover most cases.
- **Depends on:** 1.1.0's hold timer (done).
- **Data and security:** none. No schema change; the sound settings live in the browser's local storage, with the app working the same if it's unavailable.
- **Source:** Bob, 2026-11-10.

### FV-15. Share plans as JSON files: export and import

- **Status:** Done in 1.3.0 (issue #75). Format in `IMPORT-FORMATS.md` (was `docs/plan-format.md`); schema in `public/plan.schema.json`. Archived custom exercises don't count as a name match, so a new one is created. Starter plans still live in code (the shared-loader idea below is not done).
- **Why:** plans are private, so there's no way to hand a good routine to someone else, in the household or outside it, short of rebuilding it exercise by exercise. A file format also lets a routine be written outside the app, by hand or by an AI assistant asked to "make me a FitIQ plan", and then imported in one step.
- **What:**
  - **Export:** a **Share as file** action on a plan downloads `<plan-name>.fitiq-plan.json`: the plan's name and description, and each exercise in order with its targets (sets, reps, hold seconds, per side, release, rest, notes). No user IDs, plan IDs, dates, or workout history go in the file.
  - **Import:** **Import a plan** on the Plans screen (next to **New plan** and **Use a starter plan**) opens a file, shows a preview of the plan and any problems, and on **Import** creates a new plan in your own account. It never changes an existing plan, so importing the same file twice gives two plans.
  - **Catalog exercises** are written by their Free Exercise DB ID, with the exercise name alongside for people reading the file. An ID that isn't in the pinned catalog is listed in the preview; you can skip that exercise or cancel.
  - **Custom exercises** travel as a copy of their definition (name, muscles, equipment, description). On import, each one is matched by name to one of your own custom exercises, or created as a new custom exercise if you have none by that name. The preview says which.
  - **A documented format:** `docs/plan-format.md` explains each field with a complete example, and a JSON Schema (`public/plan.schema.json`) describes it for tools. The file carries `"format": "fitiq-plan"` and a `"version"` number, so later fields (FV-11's rest default, FV-12's hold at the top) can be added without breaking older files. An AI assistant given the doc, or the schema, can write a file that imports cleanly.
  - **Unknown fields are ignored** and missing optional fields get their usual defaults, so a hand-written file only needs a name and a list of exercise IDs.
- **Decided:** a file, not a share link. Nothing is stored on the server for sharing, so plans stay private (plan.md section 2) and there's no public endpoint. The person you send it to needs their own FitIQ account to import it.
- **Things to check when it's built:**
  - The import runs every exercise through the same validation as the plan builder (`src/lib/validation.ts`), so a file can't create a plan the app couldn't create itself: name lengths, sets 1 to 20, seconds 1 to 600, release only with a hold.
  - A size cap on the file (say 200 KB and 100 exercises) and clear error messages for a file that isn't JSON or isn't a FitIQ plan.
  - On iPhone, the file download and the file picker both work from the installed PWA.
  - A starter plan (FV-1) could be stored in the same format, so starters and imports share one loader.
- **Depends on:** Phase 4 plans (done). Works with FV-1 starter plans; FV-11 and FV-12 add fields to the format when they're built.
- **Data and security:** no schema change. The import inserts a plan and its exercises through `src/lib/data/plans.ts` (and `customExercises.ts` for new custom exercises) as the signed-in user, so RLS and the ownership triggers apply as for any plan; IDs in the file are never used. The file is untrusted input: it's parsed as data only, validated before anything is written, and its text is shown as plain text, never HTML. The RLS test gets no new case, since no new table or policy is involved.
- **Source:** Bob, 2026-11-11.

### FV-16. Body composition measurements, and choosing what you track

- **Status:** Proposed (requested 2026-11-13)
- **Why:** smart scales report more than weight and body fat: muscle mass, body water, and bone mass. There's nowhere to log those today. And as the list grows, most people only track a few measurements, so the rest are clutter in the Measurements list and the log form.
- **What:**
  - **Three new measurement types:** **Muscle mass**, **Body water mass**, and **Bone mass**. They're weights, so they're entered and shown in your weight unit (lb or kg, from Settings), like weigh-ins, and charted on the Measurements screen like the others.
  - **Settings → Measurements I track:** a checkbox for each measurement type (waist, hips, chest, … body fat, and the three new ones). Only checked types appear in the Measurements list and in the type picker when logging one.
  - Unchecking a type **hides it; it doesn't delete anything**. Its past entries stay in the database and come back when you check it again.
  - Defaults: every existing type stays checked, so nothing changes for current users. The three new types start unchecked, so they only appear for people who turn them on.
- **Depends on:** Phase 6 measurements (done).
- **Data and security** (a sketch, to settle when it's scheduled):
  - `body_measurements`: add `muscle_mass`, `body_water_mass`, and `bone_mass` to the `measurement_type` CHECK and to `MEASUREMENT_TYPES` in `src/lib/measurementTypes.ts`. Allow `lb` and `kg` as `measurement_unit`, and require them for exactly these three types, the way `%` goes with `body_fat` now. Each gets a sensible value range (for example 1 to 400 lb / 0.5 to 180 kg).
  - `profiles` gains `tracked_measurements text[]`. Null means "the defaults above", so there's no backfill. An update grant on the column, and a CHECK that every entry is a known type.
  - CSV export includes the new types with their units.
  - No new tables. RLS is unchanged in shape: `body_measurements` and `profiles` are already owner-only.
- **To settle when it's scheduled:**
  - Should a hidden type that has past entries still show on Progress charts, or be hidden there too? Proposed: hidden everywhere, with a note in Settings that the data is kept.
  - Should body water also be allowed as a percentage, since some scales only give a %? Proposed: mass only, as requested, and revisit if a scale needs it.
- **Source:** Bob, 2026-11-13.

### FV-8. Not planned

These are v1 non-goals with no plan to add them: public profiles and social features, nutrition, wearables, AI-generated plans, custom video hosting, and native mobile apps (plan.md section 2). They're listed so they don't get re-suggested as new ideas. Move one up into an entry if that changes.
