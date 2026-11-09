-- Account deletion requests (step 8.3). A user can ask for their account to be
-- deleted from Settings; the owner then deletes the auth user, which cascades
-- to every row they own (docs/accounts.md, ADR 0001). The frontend never
-- deletes accounts itself, so it never needs the service-role key.

alter table public.profiles add column deletion_requested_at timestamptz;

comment on column public.profiles.deletion_requested_at is
  'When the user asked for their account to be deleted. Null when no request is pending.';

grant update (deletion_requested_at) on table public.profiles to authenticated;
