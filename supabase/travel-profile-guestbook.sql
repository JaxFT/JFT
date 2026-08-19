-- Guestbook: visitors leave a short public message on someone's Travel
-- Profile, MySpace-comments-wall style. No auto-expiry on purpose,
-- it's meant to accumulate as a scrapbook, not disappear. Visibility
-- mirrors travel_profile_places' owner-or-public rule.

create table if not exists public.travel_profile_guestbook (
  id               uuid primary key default gen_random_uuid(),
  profile_user_id  uuid not null references auth.users(id) on delete cascade,
  author_user_id   uuid not null references auth.users(id) on delete cascade,
  body             text not null check (char_length(body) between 1 and 500),
  created_at       timestamptz not null default now()
);

create index if not exists travel_profile_guestbook_profile_idx
  on public.travel_profile_guestbook (profile_user_id, created_at desc);

alter table public.travel_profile_guestbook enable row level security;

drop policy if exists "travel_profile_guestbook_select" on public.travel_profile_guestbook;
create policy "travel_profile_guestbook_select" on public.travel_profile_guestbook
  for select using (
    profile_user_id = auth.uid()
    or exists (
      select 1 from public.travel_profiles tp
      where tp.user_id = travel_profile_guestbook.profile_user_id and tp.is_public
    )
  );
drop policy if exists "travel_profile_guestbook_insert" on public.travel_profile_guestbook;
create policy "travel_profile_guestbook_insert" on public.travel_profile_guestbook
  for insert with check (auth.uid() = author_user_id);
-- Either the person who wrote it, or the page owner moderating their
-- own wall, can remove an entry. Admin removal (anyone, any page) goes
-- through the service-role API bypass, not RLS, same pattern as
-- recommendations.
drop policy if exists "travel_profile_guestbook_delete" on public.travel_profile_guestbook;
create policy "travel_profile_guestbook_delete" on public.travel_profile_guestbook
  for delete using (auth.uid() = author_user_id or auth.uid() = profile_user_id);
