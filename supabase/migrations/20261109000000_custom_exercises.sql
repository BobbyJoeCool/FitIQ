-- custom_exercises: a user's own exercises, private to them (plan.md sections 6, 7, 8).
-- Pulled forward from step 2.5 for step 3.6. The shared catalog is not in the
-- database (Free Exercise DB is read at runtime), so this is the only exercise table.
--
-- Vocabularies match Free Exercise DB so custom and catalog exercises filter the
-- same way. Keep them in sync with src/lib/exerciseVocabulary.ts.

create table public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 2000),
  primary_muscles text[] not null check (
    cardinality(primary_muscles) >= 1
    and primary_muscles <@ array[
      'abdominals', 'abductors', 'adductors', 'biceps', 'calves', 'chest', 'forearms',
      'glutes', 'hamstrings', 'lats', 'lower back', 'middle back', 'neck', 'quadriceps',
      'shoulders', 'traps', 'triceps'
    ]::text[]
  ),
  secondary_muscles text[] not null default '{}' check (
    secondary_muscles <@ array[
      'abdominals', 'abductors', 'adductors', 'biceps', 'calves', 'chest', 'forearms',
      'glutes', 'hamstrings', 'lats', 'lower back', 'middle back', 'neck', 'quadriceps',
      'shoulders', 'traps', 'triceps'
    ]::text[]
  ),
  equipment text check (
    equipment is null or equipment in (
      'bands', 'barbell', 'body only', 'cable', 'dumbbell', 'e-z curl bar', 'exercise ball',
      'foam roll', 'kettlebells', 'machine', 'medicine ball', 'other'
    )
  ),
  difficulty text check (difficulty is null or difficulty in ('beginner', 'intermediate', 'expert')),
  movement_type text check (
    movement_type is null or movement_type in (
      'cardio', 'olympic weightlifting', 'plyometrics', 'powerlifting', 'strength',
      'stretching', 'strongman'
    )
  ),
  video_url text check (
    video_url is null or (char_length(video_url) <= 500 and video_url ~ '^https?://[^\s]+$')
  ),
  video_source_name text check (
    video_source_name is null or char_length(btrim(video_source_name)) between 1 and 80
  ),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.custom_exercises is
  'Exercises a user created. Private to the creator. Archived, never deleted, so old sessions keep their reference.';

create index custom_exercises_user_id_idx on public.custom_exercises (user_id);

create trigger custom_exercises_set_updated_at
  before update on public.custom_exercises
  for each row execute function public.set_updated_at();

-- Row Level Security: owner only. No delete policy: archive instead
-- (plan.md section 8). Rows go with the auth user (on delete cascade).
alter table public.custom_exercises enable row level security;

create policy custom_exercises_select_own
  on public.custom_exercises for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy custom_exercises_insert_own
  on public.custom_exercises for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy custom_exercises_update_own
  on public.custom_exercises for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Table privileges. user_id, id, and timestamps are never client-writable:
-- user_id always comes from the default, auth.uid().
revoke all on table public.custom_exercises from anon, authenticated;
grant select on table public.custom_exercises to authenticated;
grant insert (
  name, description, primary_muscles, secondary_muscles, equipment, difficulty,
  movement_type, video_url, video_source_name, is_archived
) on table public.custom_exercises to authenticated;
grant update (
  name, description, primary_muscles, secondary_muscles, equipment, difficulty,
  movement_type, video_url, video_source_name, is_archived
) on table public.custom_exercises to authenticated;
