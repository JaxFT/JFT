-- ═══════════════════════════════════════
--  JFT — PROFILES: welcome email flag
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Adds welcome_sent_at to profiles so the welcome email is sent
--  at most once per account. The /api/auth/welcome endpoint checks
--  this column, sends if NULL, then stamps the timestamp.
-- ═══════════════════════════════════════

alter table public.profiles
  add column if not exists welcome_sent_at timestamptz;
