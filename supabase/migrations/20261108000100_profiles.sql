-- profiles: one row per auth user (plan.md sections 6 and 8).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 50),
  -- Imperial by default for every account (plan.md section 17).
  weight_unit text not null default 'lb' check (weight_unit in ('lb', 'kg')),
  length_unit text not null default 'in' check (length_unit in ('in', 'cm')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Per-user settings. Private: each user reads and updates only their own row.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile when the auth user is created (invite or dashboard).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(btrim(left(new.raw_user_meta_data ->> 'display_name', 50)), '')
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: owner only. No insert policy (the trigger creates rows)
-- and no delete policy (rows go when the auth user is deleted).
alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Table privileges: anon gets nothing; authenticated may read and change only
-- the editable columns, so id and timestamps can't be rewritten from the client.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, weight_unit, length_unit) on table public.profiles to authenticated;
