-- Smart Expiry and Local Disposal Guide - Supabase schema (profiles)
--
-- Run in Supabase Studio > SQL Editor for project ywyxdmsroaqmaqyoovgb.
-- Safe to run again: every statement is idempotent, and re-running repairs the
-- table grants on an existing database.
--
-- ── Why the grants matter ──────────────────────────────────────────────
-- A verified test on this project showed that a signed-in household user could
-- PATCH their own profiles row and set is_admin = true, because the table-level
-- UPDATE grant covered every column. Row-level security alone is not enough:
-- the row was theirs, so the policy allowed it. The revoke/grant block at the
-- bottom is what actually protects the admin flag. Do not remove it.

-- ---------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null default '',
  household_size integer not null default 1,
  is_admin       boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Projects created before household_size existed.
alter table public.profiles
  add column if not exists household_size integer not null default 1;

alter table public.profiles enable row level security;

-- One profile row per auth user, carrying the name captured at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin check used by policies. SECURITY DEFINER bypasses RLS, which is what
-- stops the policy from recursing into the table it protects.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- --------------------------------------------------------------- policies

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ----------------------------------------------------------- column grants
--
-- Household users may read their profile and edit two harmless columns.
-- Everything else - is_admin above all - is unreachable from the client.
-- The signup trigger inserts as the function owner, so it is unaffected.
-- Promote the first administrator by hand:
--   update public.profiles set is_admin = true where id = '<user-uuid>';

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, household_size) on public.profiles to authenticated;

-- --------------------------------------------------------------- verify
--
-- Expect: can_write_is_admin = false
select has_column_privilege(
  'authenticated',
  'public.profiles',
  'is_admin',
  'UPDATE'
) as can_write_is_admin;
