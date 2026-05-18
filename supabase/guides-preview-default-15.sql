-- ═══════════════════════════════════════
--  JFT, GUIDES: lower default free preview from 25% to 15%
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  The original guides-body-markdown.sql set preview_percent default
--  to 25, but 25% of a long-form guide gives away too much before the
--  paywall. Drop the default to 15, then backfill any existing rows
--  that are still on the original default (every row should be 25
--  right now since the admin UI did not expose this field).
--
--  After this runs, the admin can override per-guide via the new
--  Pricing & preview panel on the editor.
-- ═══════════════════════════════════════

alter table public.guides
  alter column preview_percent set default 15;

update public.guides
  set preview_percent = 15
  where preview_percent = 25;
