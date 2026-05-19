-- ═══════════════════════════════════════
--  JFT, Passport flights: add distance_km column
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
-- ═══════════════════════════════════════

alter table public.flights
  add column if not exists distance_km integer
    check (distance_km is null or (distance_km > 0 and distance_km <= 30000));
