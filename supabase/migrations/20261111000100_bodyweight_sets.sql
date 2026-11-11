-- Bodyweight sets (issue #65): pull-ups, push-ups and the like.
-- is_bodyweight true means the load is the person's body weight. weight_value is
-- then any added weight (a vest or a plate on a belt), or null for none:
-- "10 x Body" is reps 10, is_bodyweight true, weight null;
-- "8 x Body + 25 lb" is reps 8, is_bodyweight true, weight 25 lb.

alter table public.workout_sets
  add column is_bodyweight boolean not null default false;

comment on column public.workout_sets.is_bodyweight is
  'The load is body weight. weight_value is then added weight only, or null.';

grant insert (is_bodyweight) on table public.workout_sets to authenticated;
grant update (is_bodyweight) on table public.workout_sets to authenticated;
