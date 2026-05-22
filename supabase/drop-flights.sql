-- ═══════════════════════════════════════
--  JFT, drop the flights table
--  Run in: Supabase Dashboard > SQL Editor AFTER the flight log
--  code is deployed (otherwise the live site would 500 the moment
--  this runs).
--
--  The flight log feature is being retired in favour of the
--  Country visits picker on the family dashboard. All flight logs
--  and the table that stores them are deleted here.
-- ═══════════════════════════════════════

drop policy if exists "flights_parent_access" on public.flights;
drop table if exists public.flights;

notify pgrst, 'reload schema';
