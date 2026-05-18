-- ═══════════════════════════════════════
--  JFT, PROFILES: marketing opt-in flag
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Adds marketing_opt_in to profiles for GDPR/PECR compliance.
--  Default false, both new rows AND existing rows land on opted-out
--  (existing rows pick up the default automatically because the
--  column is NOT NULL with a default). Users can opt in at signup
--  via the new checkbox or later on /account.
-- ═══════════════════════════════════════

alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default false;

-- Optional index, helpful when we later send marketing campaigns
-- ("WHERE marketing_opt_in = true"). Cheap on a small table.
create index if not exists profiles_marketing_opt_in_idx
  on public.profiles (marketing_opt_in) where marketing_opt_in = true;
