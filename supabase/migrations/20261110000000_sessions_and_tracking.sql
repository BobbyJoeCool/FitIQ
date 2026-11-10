-- The rest of the v1 schema (step 2.5, plan.md sections 6 and 8): workout
-- sessions, their exercises and sets, weigh-ins, body measurements, and cardio.
-- Delete behavior: docs/adr/0001-delete-behavior.md.

-- ---------------------------------------------------------------------------
-- workout_sessions
-- ---------------------------------------------------------------------------
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The plan it was started from, if any. Sessions copy everything they need,
  -- so the link is informational and survives the plan changing.
  plan_id uuid references public.workout_plans (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  started_at timestamptz not null default now(),
  completed_at timestamptz check (completed_at is null or completed_at >= started_at),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workout_sessions is
  'A workout as performed. In progress while completed_at is null. Private to the owner.';

-- One workout in progress per user (step 5.1).
create unique index workout_sessions_one_in_progress
  on public.workout_sessions (user_id) where completed_at is null;
create index workout_sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);
create index workout_sessions_plan_id_idx on public.workout_sessions (plan_id) where plan_id is not null;

create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- workout_session_exercises
-- ---------------------------------------------------------------------------
create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  catalog_exercise_id text check (
    catalog_exercise_id is null or char_length(catalog_exercise_id) between 1 and 200
  ),
  custom_exercise_id uuid references public.custom_exercises (id),
  -- Copied when performed, so history reads correctly even if the exercise changes.
  exercise_name text not null check (char_length(btrim(exercise_name)) between 1 and 200),
  sort_order integer not null check (sort_order >= 0),
  is_skipped boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 500),
  -- Targets copied from the plan at the start, so editing the plan never changes this.
  target_sets smallint check (target_sets is null or target_sets between 1 and 20),
  target_reps text check (target_reps is null or char_length(btrim(target_reps)) between 1 and 20),
  target_seconds smallint check (target_seconds is null or target_seconds between 1 and 600),
  per_side boolean not null default false,
  rest_seconds integer check (rest_seconds is null or rest_seconds between 0 and 3600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_session_exercises_one_exercise
    check (num_nonnulls(catalog_exercise_id, custom_exercise_id) = 1)
);

comment on table public.workout_session_exercises is
  'The exercises in a session, with the name and targets copied at the time.';

create index workout_session_exercises_session_order_idx
  on public.workout_session_exercises (session_id, sort_order);
create index workout_session_exercises_user_catalog_idx
  on public.workout_session_exercises (user_id, catalog_exercise_id);
create index workout_session_exercises_custom_idx
  on public.workout_session_exercises (custom_exercise_id) where custom_exercise_id is not null;

create trigger workout_session_exercises_set_updated_at
  before update on public.workout_session_exercises
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- workout_sets
-- ---------------------------------------------------------------------------
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_exercise_id uuid not null
    references public.workout_session_exercises (id) on delete cascade,
  set_number smallint not null check (set_number between 1 and 100),
  reps smallint check (reps is null or reps between 0 and 1000),
  weight_value numeric(7, 2) check (weight_value is null or weight_value between 0 and 2000),
  -- Each set keeps its own unit, so changing the preference never rewrites history.
  weight_unit text check (weight_unit is null or weight_unit in ('lb', 'kg')),
  duration_seconds integer check (duration_seconds is null or duration_seconds between 0 and 86400),
  distance_value numeric(8, 3) check (distance_value is null or distance_value between 0 and 1000),
  distance_unit text check (distance_unit is null or distance_unit in ('mi', 'km', 'm')),
  is_completed boolean not null default true,
  notes text check (notes is null or char_length(notes) <= 200),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sets_weight_has_unit check ((weight_value is null) = (weight_unit is null)),
  constraint workout_sets_distance_has_unit
    check ((distance_value is null) = (distance_unit is null)),
  constraint workout_sets_has_a_measure check (num_nonnulls(reps, duration_seconds, distance_value) >= 1),
  constraint workout_sets_unique_number unique (session_exercise_id, set_number)
);

comment on table public.workout_sets is
  'One set as performed. Saved as soon as it is completed, so nothing is lost mid-workout.';

create index workout_sets_user_id_idx on public.workout_sets (user_id);

create trigger workout_sets_set_updated_at
  before update on public.workout_sets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- weight_history, body_measurements, cardio_sessions
-- ---------------------------------------------------------------------------
create table public.weight_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  weight_value numeric(6, 2) not null,
  weight_unit text not null check (weight_unit in ('lb', 'kg')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Plausible human weights: 20-1000 lb, 9-455 kg.
  constraint weight_history_plausible check (
    (weight_unit = 'lb' and weight_value between 20 and 1000)
    or (weight_unit = 'kg' and weight_value between 9 and 455)
  )
);

create index weight_history_user_recorded_idx on public.weight_history (user_id, recorded_at desc);

create trigger weight_history_set_updated_at
  before update on public.weight_history
  for each row execute function public.set_updated_at();

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  measurement_type text not null check (measurement_type in (
    'neck', 'shoulders', 'chest', 'waist', 'hips', 'left_arm', 'right_arm',
    'left_thigh', 'right_thigh', 'left_calf', 'right_calf', 'body_fat'
  )),
  measurement_value numeric(6, 2) not null,
  measurement_unit text not null check (measurement_unit in ('in', 'cm', '%')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Body fat is a percentage; every other type is a length.
  constraint body_measurements_unit_matches_type
    check ((measurement_type = 'body_fat') = (measurement_unit = '%')),
  constraint body_measurements_plausible check (
    (measurement_unit = 'in' and measurement_value between 1 and 120)
    or (measurement_unit = 'cm' and measurement_value between 2.5 and 305)
    or (measurement_unit = '%' and measurement_value between 1 and 75)
  )
);

create index body_measurements_user_type_recorded_idx
  on public.body_measurements (user_id, measurement_type, recorded_at desc);

create trigger body_measurements_set_updated_at
  before update on public.body_measurements
  for each row execute function public.set_updated_at();

create table public.cardio_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_type text not null check (activity_type in (
    'walking_pad', 'walk', 'run', 'cycle', 'elliptical', 'rowing', 'swim', 'hike', 'other'
  )),
  started_at timestamptz not null default now(),
  duration_seconds integer not null check (duration_seconds between 1 and 86400),
  distance_value numeric(7, 2) check (distance_value is null or distance_value between 0 and 1000),
  distance_unit text check (distance_unit is null or distance_unit in ('mi', 'km')),
  -- Treadmill or walking pad incline, in percent.
  incline numeric(4, 1) check (incline is null or incline between 0 and 40),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cardio_sessions_distance_has_unit
    check ((distance_value is null) = (distance_unit is null))
);

create index cardio_sessions_user_started_idx on public.cardio_sessions (user_id, started_at desc);

create trigger cardio_sessions_set_updated_at
  before update on public.cardio_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Ownership: a child row's parents must belong to the same user. RLS checks
-- only the row's own user_id, so these triggers stop pointing your row at
-- someone else's session, plan, or exercise by ID.
-- ---------------------------------------------------------------------------
create function public.check_session_owner()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.plan_id is not null and not exists (
    select 1 from public.workout_plans p where p.id = new.plan_id and p.user_id = new.user_id
  ) then
    raise exception 'That plan does not belong to you.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger workout_sessions_check_owner
  before insert or update of user_id, plan_id on public.workout_sessions
  for each row execute function public.check_session_owner();

create function public.check_session_exercise_owner()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.workout_sessions s where s.id = new.session_id and s.user_id = new.user_id
  ) then
    raise exception 'That workout does not belong to you.' using errcode = '42501';
  end if;
  if new.custom_exercise_id is not null and not exists (
    select 1 from public.custom_exercises c
    where c.id = new.custom_exercise_id and c.user_id = new.user_id
  ) then
    raise exception 'That exercise does not belong to you.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger workout_session_exercises_check_owner
  before insert or update of user_id, session_id, custom_exercise_id
  on public.workout_session_exercises
  for each row execute function public.check_session_exercise_owner();

create function public.check_set_owner()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.workout_session_exercises e
    where e.id = new.session_exercise_id and e.user_id = new.user_id
  ) then
    raise exception 'That workout does not belong to you.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger workout_sets_check_owner
  before insert or update of user_id, session_exercise_id on public.workout_sets
  for each row execute function public.check_set_owner();

-- ---------------------------------------------------------------------------
-- start_workout: create a session and copy a plan's exercises and targets in
-- one transaction (step 5.1). Catalog names come from the client, which has
-- the catalog; custom names come from the table. Security invoker, so RLS and
-- the ownership triggers apply. Fails with 23505 if a workout is in progress.
-- ---------------------------------------------------------------------------
create function public.start_workout(
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
      target_sets, target_reps, target_seconds, per_side, rest_seconds, notes
    )
    select
      v_session_id, pe.catalog_exercise_id, pe.custom_exercise_id,
      left(coalesce(c.name, p_catalog_names ->> pe.catalog_exercise_id,
        replace(pe.catalog_exercise_id, '_', ' ')), 200),
      (row_number() over (order by pe.sort_order, pe.created_at)) - 1,
      pe.target_sets, pe.target_reps, pe.target_seconds, pe.per_side, pe.rest_seconds, pe.notes
    from public.workout_plan_exercises pe
    left join public.custom_exercises c on c.id = pe.custom_exercise_id
    where pe.plan_id = p_plan_id;
  end if;

  return v_session_id;
end;
$$;

revoke all on function public.start_workout(text, uuid, jsonb) from public, anon;
grant execute on function public.start_workout(text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: owner only, on every table. Users may delete their own
-- sessions (and with them, exercises and sets), single exercises and sets, and
-- weigh-ins, measurements, and cardio entries.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'workout_sessions', 'workout_session_exercises', 'workout_sets',
    'weight_history', 'body_measurements', 'cardio_sessions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t || '_delete_own', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, delete on table public.%I to authenticated', t);
  end loop;
end;
$$;

-- Column privileges. user_id, id, and timestamps are never client-writable,
-- and no row can be moved to another parent.
grant insert (plan_id, name, started_at, completed_at, notes)
  on table public.workout_sessions to authenticated;
grant update (name, completed_at, notes) on table public.workout_sessions to authenticated;

grant insert (
  session_id, catalog_exercise_id, custom_exercise_id, exercise_name, sort_order, is_skipped,
  notes, target_sets, target_reps, target_seconds, per_side, rest_seconds
) on table public.workout_session_exercises to authenticated;
grant update (sort_order, is_skipped, notes) on table public.workout_session_exercises to authenticated;

grant insert (
  session_exercise_id, set_number, reps, weight_value, weight_unit, duration_seconds,
  distance_value, distance_unit, is_completed, notes, completed_at
) on table public.workout_sets to authenticated;
grant update (
  reps, weight_value, weight_unit, duration_seconds, distance_value, distance_unit,
  is_completed, notes
) on table public.workout_sets to authenticated;

grant insert (recorded_at, weight_value, weight_unit, notes)
  on table public.weight_history to authenticated;
grant update (recorded_at, weight_value, weight_unit, notes)
  on table public.weight_history to authenticated;

grant insert (recorded_at, measurement_type, measurement_value, measurement_unit, notes)
  on table public.body_measurements to authenticated;
grant update (recorded_at, measurement_type, measurement_value, measurement_unit, notes)
  on table public.body_measurements to authenticated;

grant insert (
  activity_type, started_at, duration_seconds, distance_value, distance_unit, incline, notes
) on table public.cardio_sessions to authenticated;
grant update (
  activity_type, started_at, duration_seconds, distance_value, distance_unit, incline, notes
) on table public.cardio_sessions to authenticated;
