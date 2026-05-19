-- ═══════════════════════════════════════
--  JFT, Passport journal: add place column
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  A journal entry can already be scoped to a country (country_slug).
--  This adds a more specific free-text "place" (e.g. "Tokyo", "Eiffel
--  Tower", "Mount Fuji") so each memory is anchored to where it
--  actually happened.
-- ═══════════════════════════════════════

alter table public.journal_entries
  add column if not exists place text
    check (place is null or length(place) <= 100);
