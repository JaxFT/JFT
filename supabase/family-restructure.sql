-- ═══════════════════════════════════════
--  JFT, Family restructure
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run, all statements use IF NOT EXISTS / IF EXISTS.
--
--  Three connected changes:
--    1. Home country moves from per-child to per-parent (profiles).
--    2. Flight log is retired: drop the flights table.
--    3. The legacy per-child visits table (child_country_visits) is
--       retired now that family_country_visits is the source.
--  Backfills the new profiles.home_country_iso2 from each parent's
--  first-child home_country_iso2 (if any), so existing families
--  don't lose their home setting.
-- ═══════════════════════════════════════

-- 1. Add home_country_iso2 to profiles (the new home).
alter table public.profiles
  add column if not exists home_country_iso2 char(2);

-- 2. Backfill from children. Take the first child's home for each
--    parent that has one. distinct on (parent_id) keeps it to one
--    row per parent so the update is deterministic.
update public.profiles p
   set home_country_iso2 = sub.home_country_iso2
  from (
    select distinct on (parent_id) parent_id, home_country_iso2
      from public.children
     where home_country_iso2 is not null
     order by parent_id, created_at asc
  ) as sub
 where p.id = sub.parent_id
   and p.home_country_iso2 is null;

-- 3. Drop the per-child home column now that the value lives on
--    profiles. The kids' passports read parent.home_country_iso2
--    from this release on.
alter table public.children
  drop column if exists home_country_iso2;

-- 4. Drop the legacy per-child visits table. family_country_visits
--    is the source going forward, and previous deploys already
--    cut the code over.
drop table if exists public.child_country_visits;

-- Flights table is intentionally NOT dropped here. The flight log
-- code is being removed in a follow-up commit; a later migration
-- (sequenced after the code deploy) will drop public.flights.

-- 5. Force PostgREST to pick up schema changes immediately.
notify pgrst, 'reload schema';
