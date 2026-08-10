-- Travel Profile: a personal, MySpace-style page per account holder.
-- Deliberately separate from `family_profiles` (AI Prompt Builder) and
-- `children`/passport (kid-focused, premium-gated) — this is the
-- account holder's own identity page, free for everyone, opt-in
-- public. See conversation notes for the full product spec; Phase 1
-- only (no trip history, no followers/following, no linked buddies).

create table if not exists public.travel_profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  is_public        boolean not null default false,
  hero_photo_url   text,
  bio              text,
  current_location text,
  -- One of the six "What Kind of Traveller Are You?" quiz type ids
  -- (planner/wanderer/settler/adventurer/hacker/comfort). Free text,
  -- not an enum/FK, the quiz's type list lives in application code
  -- (src/app/what-kind-of-traveller-are-you/quiz-data.ts) and this
  -- just stores whatever the quiz last wrote.
  traveller_type   text,
  fav_place        text,
  fav_food         text,
  fav_beach        text,
  fav_swim         text,
  fav_adventure    text,
  fav_sunset       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Been / want-to-go lists, plus an optional Top 8 ranking on "been"
-- rows. One row per (user, country, list) — the same country can be
-- in both "been" and "want" (re-planning a return trip) but not
-- twice in the same list.
create table if not exists public.travel_profile_places (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  iso2       char(2) not null,
  list_type  text not null check (list_type in ('been', 'want')),
  top8_rank  smallint check (top8_rank between 1 and 8),
  created_at timestamptz not null default now(),
  unique (user_id, iso2, list_type)
);

create index if not exists travel_profile_places_user_idx
  on public.travel_profile_places (user_id, list_type);

-- At most one country per rank per user, and only meaningful on
-- "been" rows, enforced in the API layer (top8_rank simply isn't set
-- on "want" rows in practice).
create unique index if not exists travel_profile_places_top8_unique
  on public.travel_profile_places (user_id, top8_rank)
  where top8_rank is not null;

-- Travel buddies, Phase 1: a freeform named list, no account linkage
-- and no trip association yet (that's Phase 2, once trip history
-- exists to attach "trips we've taken together" to).
create table if not exists public.travel_profile_buddies (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create index if not exists travel_profile_buddies_user_idx
  on public.travel_profile_buddies (user_id);

alter table public.travel_profiles enable row level security;
alter table public.travel_profile_places enable row level security;
alter table public.travel_profile_buddies enable row level security;

-- Owner can always read/write their own row. Anyone (including
-- signed-out visitors) can read a row that's been opted public.
create policy "travel_profiles_select" on public.travel_profiles
  for select using (user_id = auth.uid() or is_public = true);
create policy "travel_profiles_insert" on public.travel_profiles
  for insert with check (user_id = auth.uid());
create policy "travel_profiles_update" on public.travel_profiles
  for update using (user_id = auth.uid());
create policy "travel_profiles_delete" on public.travel_profiles
  for delete using (user_id = auth.uid());

-- Same owner-or-public pattern, keyed off the parent travel_profiles
-- row's is_public flag (a user with no travel_profiles row yet has
-- no public places, which is correct, nothing to show).
create policy "travel_profile_places_select" on public.travel_profile_places
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.travel_profiles tp
      where tp.user_id = travel_profile_places.user_id and tp.is_public
    )
  );
create policy "travel_profile_places_insert" on public.travel_profile_places
  for insert with check (user_id = auth.uid());
create policy "travel_profile_places_update" on public.travel_profile_places
  for update using (user_id = auth.uid());
create policy "travel_profile_places_delete" on public.travel_profile_places
  for delete using (user_id = auth.uid());

create policy "travel_profile_buddies_select" on public.travel_profile_buddies
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.travel_profiles tp
      where tp.user_id = travel_profile_buddies.user_id and tp.is_public
    )
  );
create policy "travel_profile_buddies_insert" on public.travel_profile_buddies
  for insert with check (user_id = auth.uid());
create policy "travel_profile_buddies_delete" on public.travel_profile_buddies
  for delete using (user_id = auth.uid());

-- Public bucket for hero photos, same pattern as blog-photos. Only
-- one photo per user is ever referenced (travel_profiles.hero_photo_url),
-- the upload route deletes the previous object when replacing, no
-- history is kept on purpose (see product spec, "not a photo library").
insert into storage.buckets (id, name, public)
values ('travel-profile-photos', 'travel-profile-photos', true)
on conflict (id) do nothing;
