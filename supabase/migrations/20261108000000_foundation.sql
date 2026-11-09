-- Foundation: shared helpers used by later migrations.

-- Keeps updated_at current on any table that attaches this trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Lightweight database round trip, callable with the publishable key.
-- Used by the weekly keep-alive workflow (Supabase pauses free projects after
-- a week without database activity) and by the app's connection check.
-- Reads no table and returns nothing private.
create or replace function public.keepalive()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
