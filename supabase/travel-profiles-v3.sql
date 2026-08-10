-- Travel buddies, round 2: link to a real JFT account instead of a
-- freeform typed name. `name` stays as a legacy nullable column (not
-- dropped, same "keep it as a safety net" approach used elsewhere in
-- this schema) but new buddies are added via buddy_user_id going
-- forward, the app no longer writes to `name`.

alter table public.travel_profile_buddies
  alter column name drop not null;

alter table public.travel_profile_buddies
  add column if not exists buddy_user_id uuid references public.profiles(id) on delete cascade;

alter table public.travel_profile_buddies
  drop constraint if exists travel_profile_buddies_not_self;
alter table public.travel_profile_buddies
  add constraint travel_profile_buddies_not_self check (buddy_user_id is null or buddy_user_id <> user_id);

create unique index if not exists travel_profile_buddies_unique_pair
  on public.travel_profile_buddies (user_id, buddy_user_id)
  where buddy_user_id is not null;
