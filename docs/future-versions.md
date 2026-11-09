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
| FV-1 | [Stretching: a starter stretching plan, and stretch-aware plans](#fv-1-stretching) | Proposed | Phase 4 (done); hold timer needs Phase 5 |
| FV-2 | [Offline workout logging with sync](#fv-2-offline-workout-logging-with-sync) | Idea | Phase 5, Phase 7 PWA |
| FV-3 | [Move the backend to the home server](#fv-3-move-the-backend-to-the-home-server) | Idea | v1 done |
| FV-4 | [Opt-in family sharing and challenges](#fv-4-opt-in-family-sharing-and-challenges) | Idea | v1 done |
| FV-5 | [Import the exercise catalog into Postgres](#fv-5-import-the-exercise-catalog-into-postgres) | Idea | None |
| FV-6 | [Delete plans that no workout uses](#fv-6-delete-plans-that-no-workout-uses) | Idea | Phase 5 sessions |
| FV-7 | [Programs: training by day, by rotation or weekly schedule](#fv-7-programs-training-by-day-by-rotation-or-weekly-schedule) | Proposed | Phase 4 (done); best before Phase 5 and 6.5 |
| FV-8 | [Not planned: nutrition, wearables, AI plans, native apps](#fv-8-not-planned) | Not planned | None |

## Upgrades

### FV-1. Stretching

- **Status:** Proposed (requested 2026-11-09)
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

- **Status:** Idea
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

### FV-8. Not planned

These are v1 non-goals with no plan to add them: public profiles and social features, nutrition, wearables, AI-generated plans, custom video hosting, and native mobile apps (plan.md section 2). They're listed so they don't get re-suggested as new ideas. Move one up into an entry if that changes.
