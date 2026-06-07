-- Family profiles for the JFT Prompt Builder.
--
-- One row per user storing the reusable "your family" answers (adults,
-- kids' ages, home airport, travel style) so the prompt builder can
-- pre-fill them across prompts. Saving requires a free account; signed
-- out users keep their profile in localStorage only.
--
-- RLS mirrors the profiles table: each user reads/writes only their own
-- row. Admins never need to read these, so there's no service-role path.

create table if not exists public.family_profiles (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  adults       integer,
  kids_ages    integer[]   not null default '{}',
  home_airport text,
  travel_style text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.family_profiles enable row level security;

drop policy if exists "family_profiles_select_own" on public.family_profiles;
drop policy if exists "family_profiles_insert_own" on public.family_profiles;
drop policy if exists "family_profiles_update_own" on public.family_profiles;
drop policy if exists "family_profiles_delete_own" on public.family_profiles;

create policy "family_profiles_select_own"
  on public.family_profiles for select using (auth.uid() = user_id);
create policy "family_profiles_insert_own"
  on public.family_profiles for insert with check (auth.uid() = user_id);
create policy "family_profiles_update_own"
  on public.family_profiles for update using (auth.uid() = user_id);
create policy "family_profiles_delete_own"
  on public.family_profiles for delete using (auth.uid() = user_id);

-- Keep updated_at fresh. Reuses the shared trigger fn from schema.sql.
drop trigger if exists family_profiles_updated_at on public.family_profiles;
create trigger family_profiles_updated_at before update on public.family_profiles
  for each row execute procedure public.set_updated_at();
