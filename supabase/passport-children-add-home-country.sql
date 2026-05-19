-- ═══════════════════════════════════════
--  JFT, Passport children: add home_country_slug column
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Lets a parent mark a country as the kid's home country. The home
--  country is excluded from "new countries explored" travel stats
--  and the "first new country" milestone — so a kid who lives in
--  the UK can still complete the UK Adventure Pack and earn section
--  stamps for it, without it counting toward "countries visited".
-- ═══════════════════════════════════════

alter table public.children
  add column if not exists home_country_slug text
    check (home_country_slug is null or length(home_country_slug) <= 60);
