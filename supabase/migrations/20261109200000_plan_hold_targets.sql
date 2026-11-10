-- Hold targets for timed exercises such as stretches (step 4.4, docs/future-versions.md FV-1).
-- "2 x 30 s each side": target_sets 2, target_seconds 30, per_side true.

alter table public.workout_plan_exercises
  add column target_seconds smallint
    check (target_seconds is null or target_seconds between 1 and 600),
  add column per_side boolean not null default false;

comment on column public.workout_plan_exercises.target_seconds is
  'Hold or work time per set, in seconds. Used instead of, or with, target_reps.';
comment on column public.workout_plan_exercises.per_side is
  'The target applies to each side (left and right), e.g. a stretch held 30 s each side.';

grant insert (target_seconds, per_side) on table public.workout_plan_exercises to authenticated;
grant update (target_seconds, per_side) on table public.workout_plan_exercises to authenticated;
