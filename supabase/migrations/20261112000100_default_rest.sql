-- FV-11 (#77): a default rest, in Settings and optionally per plan, that plan
-- exercises follow, adjust with an offset, or replace with a set time.
--
-- Past workouts never change: start_workout resolves each exercise's rest to
-- plain seconds and copies it into workout_session_exercises.rest_seconds, as
-- before. Existing plans behave the same: exercises with a rest become set
-- times, and exercises with none follow the default, which starts off (null)
-- until the user sets one.

-- Settings default. Null means off: no rest timer unless the exercise sets one.
alter table public.profiles
  add column default_rest_seconds smallint
    check (default_rest_seconds is null or default_rest_seconds between 0 and 3600);

comment on column public.profiles.default_rest_seconds is
  'Default rest between sets, in seconds, for plan exercises that follow the default. Null: off.';

grant update (default_rest_seconds) on table public.profiles to authenticated;

-- A plan's own default, which wins over the profile's.
alter table public.workout_plans
  add column default_rest_seconds smallint
    check (default_rest_seconds is null or default_rest_seconds between 0 and 3600);

comment on column public.workout_plans.default_rest_seconds is
  'This plan''s default rest, in seconds. Null: use the profile default.';

grant insert (default_rest_seconds) on table public.workout_plans to authenticated;
grant update (default_rest_seconds) on table public.workout_plans to authenticated;

-- How each plan exercise rests. rest_seconds now holds the set time only.
alter table public.workout_plan_exercises
  add column rest_mode text not null default 'default'
    check (rest_mode in ('default', 'offset', 'fixed')),
  add column rest_offset_seconds smallint
    check (rest_offset_seconds is null or rest_offset_seconds between -3600 and 3600);

update public.workout_plan_exercises set rest_mode = 'fixed' where rest_seconds is not null;

alter table public.workout_plan_exercises
  add constraint workout_plan_exercises_rest_fixed
    check ((rest_mode = 'fixed') = (rest_seconds is not null)),
  add constraint workout_plan_exercises_rest_offset
    check ((rest_mode = 'offset') = (rest_offset_seconds is not null));

comment on column public.workout_plan_exercises.rest_mode is
  'default: the plan''s or profile''s default rest. offset: the default plus rest_offset_seconds. fixed: rest_seconds.';
comment on column public.workout_plan_exercises.rest_offset_seconds is
  'Seconds added to (or, when negative, taken from) the default rest. Only with rest_mode offset.';

grant insert (rest_mode, rest_offset_seconds) on table public.workout_plan_exercises to authenticated;
grant update (rest_mode, rest_offset_seconds) on table public.workout_plan_exercises to authenticated;

-- start_workout resolves the rest. Same signature, so callers and grants are unchanged.
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
  v_default smallint;
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
    -- The plan's default, else the caller's own Settings default (RLS: own profile only).
    select coalesce(
      (select p.default_rest_seconds from public.workout_plans p where p.id = p_plan_id),
      (select pr.default_rest_seconds from public.profiles pr where pr.id = (select auth.uid()))
    ) into v_default;

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
      case pe.rest_mode
        when 'fixed' then pe.rest_seconds
        -- greatest() skips nulls, so check for no default first: no default, no rest.
        when 'offset' then case when v_default is null then null
          else greatest(0, least(3600, v_default + pe.rest_offset_seconds)) end
        else v_default
      end,
      pe.notes
    from public.workout_plan_exercises pe
    left join public.custom_exercises c on c.id = pe.custom_exercise_id
    where pe.plan_id = p_plan_id;
  end if;

  return v_session_id;
end;
$$;
