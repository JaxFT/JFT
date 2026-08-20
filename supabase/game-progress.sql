-- ═══════════════════════════════════════
--  GET THE FAMILY THERE — game progress sync
-- ═══════════════════════════════════════
-- Run this in: Supabase Dashboard > SQL Editor
--
-- The game itself works entirely from localStorage with no account
-- required (see /adventure-game). This table only exists so a
-- logged-in user's best scores / unlocks / passport stamps follow
-- them across devices. Anonymous play never touches this table.

create table if not exists public.game_progress (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  country_slug   text not null,
  best_score     integer not null default 0,
  unlocked       boolean not null default false,
  passport_stamp boolean not null default false,
  updated_at     timestamptz not null default now(),
  primary key (user_id, country_slug)
);

alter table public.game_progress enable row level security;

create policy "game_progress_select_own" on public.game_progress
  for select using (auth.uid() = user_id);

create policy "game_progress_insert_own" on public.game_progress
  for insert with check (auth.uid() = user_id);

create policy "game_progress_update_own" on public.game_progress
  for update using (auth.uid() = user_id);

drop trigger if exists game_progress_updated_at on public.game_progress;
create trigger game_progress_updated_at before update on public.game_progress
  for each row execute procedure public.set_updated_at();
