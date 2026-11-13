-- FV-6 (#76): a plan that no workout references can be deleted. Any plan a
-- workout started from (in progress or finished) stays archive-only, as in
-- docs/adr/0001-delete-behavior.md. Deleting a plan takes its plan exercises
-- with it (existing cascade).
--
-- The check reads workout_sessions under the caller's own RLS, which is
-- enough: check_session_owner makes sure a session's plan belongs to the same
-- user, so every session that can point at this plan is visible here. If a
-- workout is started from the plan at the same moment it's deleted, the
-- session's plan_id is set null by the existing foreign key and the workout
-- keeps everything it copied.

create policy workout_plans_delete_unused
  on public.workout_plans for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.workout_sessions s where s.plan_id = workout_plans.id
    )
  );

grant delete on table public.workout_plans to authenticated;
