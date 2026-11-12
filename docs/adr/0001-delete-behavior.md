# 1. Delete behavior per relationship

- **Status:** Accepted, 2026-11-09. Covers every v1 table: the plan tables came with Phase 4, the rest with step 2.5 (#14). Amended 2026-11-12 (1.4.0, FV-6, #76): plans no session references can be deleted.
- **Context:** plan.md section 8 says to archive plans and exercises instead of deleting them when sessions reference them, and to decide cascade or restrict for each relationship before writing its migration. Sessions copy what was performed, so history never depends on a live plan.

## Decision

Users never hard-delete anything that history can point at (custom exercises, plans). They archive it instead. The one exception is a plan that no session references (in progress or finished): nothing points at it, so it can be deleted (FV-6). Records that *are* history (workouts, sets, weigh-ins, measurements, cardio) can be deleted by their owner, because a mistaken entry should be removable and nothing else depends on them.

Every user-owned table has `user_id ... references auth.users on delete cascade`, so deleting an account (step 8.3) removes all of that person's rows in one statement.

| Table | Can the user delete rows? | Relationship | On delete |
| --- | --- | --- | --- |
| `profiles` | No | `id` → `auth.users` | cascade |
| `custom_exercises` | No: archive (`is_archived`) | `user_id` → `auth.users` | cascade |
| `workout_plans` | Only if no session references it (`workout_plans_delete_unused`); otherwise archive (`is_archived`) | `user_id` → `auth.users` | cascade |
| `workout_plan_exercises` | Yes: removing one from a plan | `user_id` → `auth.users` | cascade |
| | | `plan_id` → `workout_plans` | cascade (deleting an unused plan takes its exercises with it) |
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

- A plan made by mistake can be deleted as long as no workout was started from it. The delete policy checks `workout_sessions` under the caller's RLS, which sees every session that could point at the plan, because `check_session_owner` keeps a session's plan in the same account. If a workout starts from the plan at the moment it's deleted, the session's `plan_id` is set null and the workout keeps everything it copied. Once a workout has used a plan, it's archive-only, unless every workout from it is deleted first.
- Removing an exercise from a plan never changes recorded workouts, because sessions copy the exercise name and their own sets.
- Sessions don't reference plan exercises at all: they copy names and targets when the workout starts. Editing, reordering or removing plan exercises can't touch recorded workouts.
