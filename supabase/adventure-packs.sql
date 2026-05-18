-- ═══════════════════════════════════════
--  JFT — ADVENTURE PACKS
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Three tables backing the country-specific learning packs:
--   - jax_adventure_pack_sessions  one row per (user, country):
--                                  age mode, missions complete, expiry.
--   - jax_adventure_pack_answers   one row per (user, country, section):
--                                  per-section answers blob.
--   - jax_pack_purchases           one row per (user, country) when a
--                                  one-off pack is purchased. Schema is
--                                  ready for Stripe; UI is paywalled
--                                  for now.
--
--  Data is held for 30 days from the last visit then wiped by the
--  scheduled jax_expire_pack_data() helper.
-- ═══════════════════════════════════════

-- ── TABLES ───────────────────────────────────────────────────────
create table if not exists public.jax_adventure_pack_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  country_slug      text not null,
  age_mode          text not null default 'younger' check (age_mode in ('younger','older')),
  missions_complete text[] not null default '{}',
  created_at        timestamptz not null default now(),
  last_saved_at     timestamptz not null default now(),
  expires_at        timestamptz not null default (now() + interval '30 days'),
  unique(user_id, country_slug)
);

create table if not exists public.jax_adventure_pack_answers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  country_slug  text not null,
  section       text not null,
  answers       jsonb not null default '{}',
  updated_at    timestamptz not null default now(),
  unique(user_id, country_slug, section)
);

create table if not exists public.jax_pack_purchases (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  country_slug             text not null,
  purchased_at             timestamptz not null default now(),
  stripe_payment_intent    text,
  unique(user_id, country_slug)
);

create index if not exists jap_sessions_user_idx on public.jax_adventure_pack_sessions (user_id);
create index if not exists jap_sessions_expires_idx on public.jax_adventure_pack_sessions (expires_at);
create index if not exists jap_answers_user_idx on public.jax_adventure_pack_answers (user_id, country_slug);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────
alter table public.jax_adventure_pack_sessions enable row level security;
alter table public.jax_adventure_pack_answers  enable row level security;
alter table public.jax_pack_purchases          enable row level security;

drop policy if exists "jap_sessions_self" on public.jax_adventure_pack_sessions;
create policy "jap_sessions_self" on public.jax_adventure_pack_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "jap_answers_self" on public.jax_adventure_pack_answers;
create policy "jap_answers_self" on public.jax_adventure_pack_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "jap_purchases_self_select" on public.jax_pack_purchases;
create policy "jap_purchases_self_select" on public.jax_pack_purchases
  for select using (auth.uid() = user_id);

-- ── 30-DAY EXPIRY HELPER ─────────────────────────────────────────
-- Schedule this with pg_cron / Supabase Scheduled Functions to wipe
-- old data nightly. The expiry is enforced at the DB level so even
-- if the cron isn't running, expired sessions still hard-stop being
-- read (the app filters on expires_at).
create or replace function public.jax_expire_pack_data()
returns void language plpgsql security definer set search_path = public as $func$
begin
  delete from public.jax_adventure_pack_answers
  where user_id in (
    select user_id from public.jax_adventure_pack_sessions
    where expires_at < now()
  );
  delete from public.jax_adventure_pack_sessions where expires_at < now();
end;
$func$;
