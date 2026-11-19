-- Smart Expiry and Local Disposal Guide - Supabase schema
--
-- Run this once in Supabase Studio > SQL Editor for project
-- ywyxdmsroaqmaqyoovgb. Safe to run again: every statement is idempotent.
--
-- Why it is needed: the Flutter app signs users up with
-- `data: {full_name}` and reads `profiles.is_admin`. Without the trigger
-- below, signup succeeds but no profile row ever appears, so isAdmin()
-- always returns false.

-- ---------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

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

-- Column-level grants are the real guard: a household user can rename itself
-- but can never write is_admin, even though the update policy matches.
-- Promote the first administrator by hand:
--   update public.profiles set is_admin = true where id = '<user-uuid>';
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
