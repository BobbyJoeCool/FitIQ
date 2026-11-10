# 1. Delete behavior per relationship

- **Status:** Accepted for the tables that exist so far (2026-11-09). Step 2.5 (#14) adds the session, set, weight, measurement and cardio rows to the table below.
- **Context:** plan.md section 8 says to archive plans and exercises instead of deleting them when sessions reference them, and to decide cascade or restrict for each relationship before writing its migration. Sessions copy what was performed, so history never depends on a live plan.

## Decision

Users never hard-delete anything that history can point at. They archive it instead. The only user-facing delete is removing an exercise from a plan.

Every user-owned table has `user_id ... references auth.users on delete cascade`, so deleting an account (step 8.3) removes all of that person's rows in one statement.

| Table | Can the user delete rows? | Relationship | On delete |
| --- | --- | --- | --- |
| `profiles` | No | `id` → `auth.users` | cascade |
| `custom_exercises` | No: archive (`is_archived`) | `user_id` → `auth.users` | cascade |
| `workout_plans` | No: archive (`is_archived`) | `user_id` → `auth.users` | cascade |
| `workout_plan_exercises` | Yes: removing one from a plan | `user_id` → `auth.users` | cascade |
| | | `plan_id` → `workout_plans` | cascade (only reached by account deletion, since plans can't be deleted) |
| | | `custom_exercise_id` → `custom_exercises` | no action |

**Why "no action" and not "restrict" for `custom_exercise_id`:** both block deleting a custom exercise that a plan still uses. But "restrict" checks immediately, so deleting an account could fail partway through its own cascade, depending on which table Postgres reaches first. "No action" checks at the end of the statement, when both rows are gone. This was tested on the local stack.

**Pointing at another user's rows:** RLS only checks the row's own `user_id`. A trigger (`check_plan_exercise_owner`) also checks that the plan and the custom exercise belong to the same user. The RLS test covers it.

## Consequences

- A plan made by mistake can't be deleted, only archived. That's fine for 2 to 4 people. If it becomes annoying, a delete limited to plans that no session references can come later.
- Removing an exercise from a plan never changes recorded workouts, because sessions copy the exercise name and their own sets.
- Step 2.5 must give `workout_sessions.plan_id` an `on delete set null` (or no action) relationship, and session exercises must not cascade from plan exercises.
