-- Interval holds (issue #67): hold, release, repeat, like the ab roller.
-- "3 x 5 reps, hold 10 s, release 5 s": target_sets 3, target_reps '5', target_seconds 10,
-- target_release_seconds 5. The workout runs 5 holds with a 5 s release between them,
-- then logs one set.

alter table public.workout_plan_exercises
  add column target_release_seconds smallint
    check (target_release_seconds is null or target_release_seconds between 1 and 600),
  add constraint workout_plan_exercises_release_needs_hold
    check (target_release_seconds is null or target_seconds is not null);

comment on column public.workout_plan_exercises.target_release_seconds is
  'Rest between repeated holds within one set, in seconds. Needs target_seconds.';

grant insert (target_release_seconds) on table public.workout_plan_exercises to authenticated;
grant update (target_release_seconds) on table public.workout_plan_exercises to authenticated;

-- Copied into the workout like the other targets, so editing the plan never changes it.
alter table public.workout_session_exercises
  add column target_release_seconds smallint
    check (target_release_seconds is null or target_release_seconds between 1 and 600);

grant insert (target_release_seconds) on table public.workout_session_exercises to authenticated;

-- start_workout copies the new target. Same signature, so callers and grants are unchanged.
create or replace function public.start_workout(
  p_name text,
  p_plan_id uuid default null,
  p_catalog_names jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  if p_plan_id is not null and not exists (
    select 1 from public.workout_plans p where p.id = p_plan_id
  ) then
    raise exception 'Plan not found.' using errcode = 'P0002';
  end if;

  insert into public.workout_sessions (plan_id, name)
  values (p_plan_id, p_name)
  returning id into v_session_id;

  if p_plan_id is not null then
    insert into public.workout_session_exercises (
      session_id, catalog_exercise_id, custom_exercise_id, exercise_name, sort_order,
      target_sets, target_reps, target_seconds, target_release_seconds, per_side,
      rest_seconds, notes
    )
    select
      v_session_id, pe.catalog_exercise_id, pe.custom_exercise_id,
      left(coalesce(c.name, p_catalog_names ->> pe.catalog_exercise_id,
        replace(pe.catalog_exercise_id, '_', ' ')), 200),
      (row_number() over (order by pe.sort_order, pe.created_at)) - 1,
      pe.target_sets, pe.target_reps, pe.target_seconds, pe.target_release_seconds, pe.per_side,
      pe.rest_seconds, pe.notes
    from public.workout_plan_exercises pe
    left join public.custom_exercises c on c.id = pe.custom_exercise_id
    where pe.plan_id = p_plan_id;
  end if;

  return v_session_id;
end;
$$;
