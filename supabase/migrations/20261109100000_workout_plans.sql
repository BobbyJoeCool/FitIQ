-- workout_plans and workout_plan_exercises: reusable routines (plan.md sections 6, 8, 9.3).
-- Pulled forward from step 2.5 for Phase 4. Delete behavior: docs/adr/0001-delete-behavior.md.

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 1000),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workout_plans is
  'A user''s reusable routines. Private to the owner. Archived, never deleted, so sessions started from a plan keep their reference.';

create index workout_plans_user_id_idx on public.workout_plans (user_id);

create trigger workout_plans_set_updated_at
  before update on public.workout_plans
  for each row execute function public.set_updated_at();

create table public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  -- Exactly one of these: a Free Exercise DB ID (no foreign key, the catalog
  -- isn't in the database) or one of the user's own exercises.
  catalog_exercise_id text check (
    catalog_exercise_id is null or char_length(catalog_exercise_id) between 1 and 200
  ),
  -- No action (not restrict), so deleting an account can cascade through both
  -- tables in one statement. Users can't delete custom exercises anyway.
  custom_exercise_id uuid references public.custom_exercises (id),
  sort_order integer not null check (sort_order >= 0),
  target_sets smallint check (target_sets is null or target_sets between 1 and 20),
  -- Text so it can hold a range or a time: "8-12", "10", "30 s", "AMRAP".
  target_reps text check (
    target_reps is null or char_length(btrim(target_reps)) between 1 and 20
  ),
  rest_seconds integer check (rest_seconds is null or rest_seconds between 0 and 3600),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_plan_exercises_one_exercise
    check (num_nonnulls(catalog_exercise_id, custom_exercise_id) = 1)
);

comment on table public.workout_plan_exercises is
  'The exercises in a plan, in order, with targets. Editing these never changes recorded sessions, which copy what was performed.';

create index workout_plan_exercises_plan_order_idx
  on public.workout_plan_exercises (plan_id, sort_order);
create index workout_plan_exercises_user_id_idx on public.workout_plan_exercises (user_id);
create index workout_plan_exercises_custom_exercise_id_idx
  on public.workout_plan_exercises (custom_exercise_id)
  where custom_exercise_id is not null;

create trigger workout_plan_exercises_set_updated_at
  before update on public.workout_plan_exercises
  for each row execute function public.set_updated_at();

-- A plan exercise must belong to the same user as its plan and its custom
-- exercise. RLS alone can't stop a user from pointing their own row at someone
-- else's plan or exercise by ID, so this trigger checks the parents.
create function public.check_plan_exercise_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.workout_plans p
    where p.id = new.plan_id and p.user_id = new.user_id
  ) then
    raise exception 'That plan does not belong to you.' using errcode = '42501';
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

create trigger workout_plan_exercises_check_owner
  before insert or update of user_id, plan_id, custom_exercise_id
  on public.workout_plan_exercises
  for each row execute function public.check_plan_exercise_owner();

-- Reorder a plan's exercises in one transaction: p_ids lists every exercise in
-- the plan exactly once, in the new order. Security invoker, so RLS applies and
-- another user's plan looks empty.
create function public.reorder_plan_exercises(p_plan_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) as t (id))
    or cardinality(p_ids) <> (
      select count(*) from public.workout_plan_exercises e where e.plan_id = p_plan_id
    )
    or exists (
      select 1 from unnest(p_ids) as t (id)
      where not exists (
        select 1 from public.workout_plan_exercises e
        where e.id = t.id and e.plan_id = p_plan_id
      )
    )
  then
    raise exception 'List every exercise in the plan exactly once.' using errcode = '22023';
  end if;

  update public.workout_plan_exercises e
  set sort_order = o.ord - 1
  from unnest(p_ids) with ordinality as o (id, ord)
  where e.id = o.id and e.plan_id = p_plan_id;
end;
$$;

revoke all on function public.reorder_plan_exercises(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_plan_exercises(uuid, uuid[]) to authenticated;

-- Row Level Security: owner only.
-- Plans: no delete policy, archive instead (plan.md section 8).
-- Plan exercises: delete allowed, to remove an exercise from a plan. Sessions
-- copy what was performed, so this never changes history.
alter table public.workout_plans enable row level security;
alter table public.workout_plan_exercises enable row level security;

create policy workout_plans_select_own
  on public.workout_plans for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy workout_plans_insert_own
  on public.workout_plans for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy workout_plans_update_own
  on public.workout_plans for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy workout_plan_exercises_select_own
  on public.workout_plan_exercises for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy workout_plan_exercises_insert_own
  on public.workout_plan_exercises for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy workout_plan_exercises_update_own
  on public.workout_plan_exercises for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy workout_plan_exercises_delete_own
  on public.workout_plan_exercises for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Table privileges. user_id, id, and timestamps are never client-writable.
-- A plan exercise can't move to another plan or change exercise: remove it
-- and add a new one instead.
revoke all on table public.workout_plans from anon, authenticated;
grant select on table public.workout_plans to authenticated;
grant insert (name, description, is_archived) on table public.workout_plans to authenticated;
grant update (name, description, is_archived) on table public.workout_plans to authenticated;

revoke all on table public.workout_plan_exercises from anon, authenticated;
grant select, delete on table public.workout_plan_exercises to authenticated;
grant insert (
  plan_id, catalog_exercise_id, custom_exercise_id, sort_order, target_sets, target_reps,
  rest_seconds, notes
) on table public.workout_plan_exercises to authenticated;
grant update (sort_order, target_sets, target_reps, rest_seconds, notes)
  on table public.workout_plan_exercises to authenticated;
