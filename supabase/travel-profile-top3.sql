-- Favourite countries visited (formerly "My Travel 8") is now capped
-- at 3, not 8. Column name top8_rank is kept as-is, renaming it isn't
-- worth a migration for what's just a smaller number range now.

update public.travel_profile_places set top8_rank = null where top8_rank > 3;

alter table public.travel_profile_places
  drop constraint if exists travel_profile_places_top8_rank_check;
alter table public.travel_profile_places
  add constraint travel_profile_places_top8_rank_check check (top8_rank between 1 and 3);
