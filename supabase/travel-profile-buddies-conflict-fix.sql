-- Fixes "no unique or exclusion constraint matching the ON CONFLICT
-- specification" when adding a travel buddy. travel-profiles-v3.sql
-- made travel_profile_buddies_unique_pair a partial index (where
-- buddy_user_id is not null), but Postgres can't target a partial
-- index with a plain ON CONFLICT (user_id, buddy_user_id) clause,
-- which is what the Supabase JS upsert() in buddies/route.ts and
-- backfill-default-buddy/route.ts generates. Dropping the WHERE
-- clause is safe, Postgres already treats NULL <> NULL for
-- uniqueness purposes, so legacy rows with a null buddy_user_id
-- (freeform-name buddies from Phase 1) still aren't deduped against
-- each other, only real linked pairs are.

drop index if exists public.travel_profile_buddies_unique_pair;

create unique index if not exists travel_profile_buddies_unique_pair
  on public.travel_profile_buddies (user_id, buddy_user_id);
