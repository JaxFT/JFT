-- ═══════════════════════════════════════
--  JFT, child profile age mode
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Adds an age_mode column to children so the parent can set a
--  default age tier (younger / older) per child. Adventure packs
--  use this to pick which content tier to render: 'older' shows
--  everything including olderOnly sections; 'younger' simplifies
--  stories and makes the tile game easier.
--
--  Existing children default to 'older' — that's the historical
--  default for packs and won't surprise anyone.
-- ═══════════════════════════════════════

alter table public.children
  add column if not exists age_mode text not null default 'older'
  check (age_mode in ('younger', 'older'));

notify pgrst, 'reload schema';
