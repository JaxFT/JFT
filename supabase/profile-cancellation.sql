-- ═══════════════════════════════════════
--  JFT — PROFILES: premium cancellation timestamp
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Adds cancellation_requested_at to profiles. When a premium member
--  hits "Cancel premium" on /account we stamp this column. They keep
--  access until the end of their paid period — no immediate revoke,
--  no refund for the remainder. Once Stripe is wired we'll also call
--  the Stripe subscription cancel API; the column tracks the user's
--  intent regardless of the billing backend state.
-- ═══════════════════════════════════════

alter table public.profiles
  add column if not exists cancellation_requested_at timestamptz;
