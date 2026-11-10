# 1. Delete behavior per relationship

- **Status:** Accepted, 2026-11-09. Covers every v1 table: the plan tables came with Phase 4, the rest with step 2.5 (#14).
- **Context:** plan.md section 8 says to archive plans and exercises instead of deleting them when sessions reference them, and to decide cascade or restrict for each relationship before writing its migration. Sessions copy what was performed, so history never depends on a live plan.

## Decision

Users never hard-delete anything that history can point at (custom exercises, plans). They archive it instead. Records that *are* history (workouts, sets, weigh-ins, measurements, cardio) can be deleted by their owner, because a mistaken entry should be removable and nothing else depends on them.

Every user-owned table has `user_id ... references auth.users on delete cascade`, so deleting an account (step 8.3) removes all of that person's rows in one statement.

| Table | Can the user delete rows? | Relationship | On delete |
| --- | --- | --- | --- |
| `profiles` | No | `id` → `auth.users` | cascade |
| `custom_exercises` | No: archive (`is_archived`) | `user_id` → `auth.users` | cascade |
| `workout_plans` | No: archive (`is_archived`) | `user_id` → `auth.users` | cascade |
| `workout_plan_exercises` | Yes: removing one from a plan | `user_id` → `auth.users` | cascade |
| | | `plan_id` → `workout_plans` | cascade (only reached by account deletion, since plans can't be deleted) |
| | | `custom_exercise_id` → `custom_exercises` | no action |
| `workout_sessions` | Yes: delete a workout (takes its exercises and sets with it) | `user_id` → `auth.users` | cascade |
| | | `plan_id` → `workout_plans` | set null (the session copied everything it needs) |
| `workout_session_exercises` | Yes: remove one from a workout | `user_id` → `auth.users` | cascade |
| | | `session_id` → `workout_sessions` | cascade |
| | | `custom_exercise_id` → `custom_exercises` | no action (custom exercises are archive-only) |
| `workout_sets` | Yes | `user_id` → `auth.users` | cascade |
| | | `session_exercise_id` → `workout_session_exercises` | cascade |
| `weight_history`, `body_measurements`, `cardio_sessions` | Yes | `user_id` → `auth.users` | cascade |

**Why "no action" and not "restrict" for `custom_exercise_id`:** both block deleting a custom exercise that a plan still uses. But "restrict" checks immediately, so deleting an account could fail partway through its own cascade, depending on which table Postgres reaches first. "No action" checks at the end of the statement, when both rows are gone. This was tested on the local stack.

**Pointing at another user's rows:** RLS only checks the row's own `user_id`. Triggers (`check_plan_exercise_owner`, `check_session_owner`, `check_session_exercise_owner`, `check_set_owner`) also check that every parent (plan, session, session exercise, custom exercise) belongs to the same user. The RLS test covers each one.

## Consequences

- A plan made by mistake can't be deleted, only archived. That's fine for 2 to 4 people. If it becomes annoying, a delete limited to plans that no session references can come later.
- Removing an exercise from a plan never changes recorded workouts, because sessions copy the exercise name and their own sets.
- Sessions don't reference plan exercises at all: they copy names and targets when the workout starts. Editing, reordering or removing plan exercises can't touch recorded workouts.
