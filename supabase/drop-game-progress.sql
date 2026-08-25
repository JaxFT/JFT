-- ═══════════════════════════════════════
--  JFT, drop the game_progress table
--  Run in: Supabase Dashboard > SQL Editor AFTER the Adventure Game
--  removal is deployed (otherwise the live site would 500 the moment
--  this runs, if anything still references the table).
--
--  Adventure Game ("Get the Family There!") is being removed. All
--  synced progress and the table that stores it are deleted here.
-- ═══════════════════════════════════════

drop policy if exists "game_progress_select_own" on public.game_progress;
drop policy if exists "game_progress_insert_own" on public.game_progress;
drop policy if exists "game_progress_update_own" on public.game_progress;
drop trigger if exists game_progress_updated_at on public.game_progress;
drop table if exists public.game_progress;

notify pgrst, 'reload schema';
