-- Recommendations: real places (food or attractions) that members have
-- actually visited, rated out of 5. Browsable on /recommendations
-- (filterable by country/town/category) and shown as "Favourite
-- restaurants"/"Favourite attractions" on the member's own Travel
-- Profile. v1, no photos — a pasted Google Maps link stands in for a
-- verified location until Places API autocomplete is wired up.

create table if not exists public.recommendations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  category         text not null check (category in ('food', 'attraction')),
  place_name       text not null,
  iso2             char(2) not null,
  town             text not null,
  google_maps_url  text,
  date_visited     date,
  rating           smallint not null check (rating between 1 and 5),
  note             text,
  created_at       timestamptz not null default now()
);

create index if not exists recommendations_browse_idx
  on public.recommendations (category, iso2);
create index if not exists recommendations_user_idx
  on public.recommendations (user_id, category);

alter table public.recommendations enable row level security;

-- Members-only directory, not public like /discover — any signed-in
-- account can browse everyone's entries, but signed-out visitors see
-- nothing (matches the page being gated in application code too).
drop policy if exists "recommendations_select" on public.recommendations;
create policy "recommendations_select" on public.recommendations
  for select using (auth.uid() is not null);
drop policy if exists "recommendations_insert" on public.recommendations;
create policy "recommendations_insert" on public.recommendations
  for insert with check (user_id = auth.uid());
drop policy if exists "recommendations_update" on public.recommendations;
create policy "recommendations_update" on public.recommendations
  for update using (user_id = auth.uid());
drop policy if exists "recommendations_delete" on public.recommendations;
create policy "recommendations_delete" on public.recommendations
  for delete using (user_id = auth.uid());
