-- ═══════════════════════════════════════
--  JFT, FAMILY TRAVEL PASSPORT
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Children, their per-country progress, the stamps they collect, the
--  journal entries they write, and the family's flight log. The data
--  here is the long-term emotional value of the product, so it's
--  deliberately conservative: no soft-deletes (cascade on parent
--  removal only), updated_at on every mutable row, history-friendly
--  status fields on stamps, and indexes wherever the app reads.
--
--  Access model:
--   - Parent: authenticated via Supabase auth, RLS lets them read/write
--             ONLY their own children's rows.
--   - Kid:    no auth at all. Accesses /kid/{qr_token} which is
--             server-rendered. All kid writes go through API routes
--             that validate the token themselves and then use the
--             service role — RLS never sees the kid.
-- ═══════════════════════════════════════

-- ── HELPERS ──────────────────────────────────────────────────────

-- Auto-update updated_at on row mutation. Reusable across all tables
-- that want to track when they were last edited.
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$;


-- ── CHILDREN ─────────────────────────────────────────────────────
-- Each row is one kid in one family. The parent is the auth user
-- who owns the workspace. qr_token is the bearer token a kid uses to
-- reach their passport at /kid/{token} — regeneratable to revoke
-- access if a token leaks.
create table if not exists public.children (
  id                  uuid primary key default gen_random_uuid(),
  parent_id           uuid not null references auth.users(id) on delete cascade,
  name                text not null check (length(name) between 1 and 60),
  -- Avatar is an emoji or short identifier the parent picks. Kept
  -- simple in v1; later we can swap for an uploaded image URL.
  avatar              text not null default '🧒' check (length(avatar) between 1 and 16),
  -- 122 bits of entropy = unguessable. Indexed unique for kid lookup.
  qr_token            text not null unique default gen_random_uuid()::text,
  permission_mode     text not null default 'guided'
                      check (permission_mode in ('view','guided','creator')),
  -- When true (default), auto-suggested stamps land as 'awarded' and
  -- show up immediately. When false, they land as 'suggested' and the
  -- parent has to approve them via the dashboard.
  stamp_auto_approve  boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists children_parent_idx on public.children (parent_id);
-- qr_token already has a unique index from the constraint above.

drop trigger if exists tg_children_touch on public.children;
create trigger tg_children_touch
  before update on public.children
  for each row execute function public.tg_touch_updated_at();


-- ── PACK ASSIGNMENTS ─────────────────────────────────────────────
-- Which Adventure Packs a parent has assigned to a child. Until a
-- pack is assigned, it doesn't show up in the kid's pack list. The
-- composite primary key prevents duplicate assignments.
create table if not exists public.child_pack_assignments (
  child_id      uuid not null references public.children(id) on delete cascade,
  country_slug  text not null,
  assigned_at   timestamptz not null default now(),
  primary key (child_id, country_slug)
);

create index if not exists cpa_child_idx on public.child_pack_assignments (child_id);


-- ── KID ADVENTURE PACK PROGRESS ──────────────────────────────────
-- Per-child mirror of jax_adventure_pack_sessions / _answers. Kept
-- separate so the parent's own pack progress (when they preview a
-- pack while signed in) doesn't get tangled with their children's
-- progress. completed_at is set the moment all 9 missions are done
-- and is what country_visits / stamps key off.
create table if not exists public.kid_adventure_pack_sessions (
  id                uuid primary key default gen_random_uuid(),
  child_id          uuid not null references public.children(id) on delete cascade,
  country_slug      text not null,
  age_mode          text not null default 'younger' check (age_mode in ('younger','older')),
  missions_complete text[] not null default '{}',
  -- Set once when the kid first completes all 9 missions for this
  -- pack. Used to fire the ADVENTURE_PACK_COMPLETE stamp exactly
  -- once. Stays set even if a mission is later un-completed.
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(child_id, country_slug)
);

create index if not exists kaps_child_idx on public.kid_adventure_pack_sessions (child_id);
create index if not exists kaps_completed_idx on public.kid_adventure_pack_sessions (completed_at);

drop trigger if exists tg_kaps_touch on public.kid_adventure_pack_sessions;
create trigger tg_kaps_touch
  before update on public.kid_adventure_pack_sessions
  for each row execute function public.tg_touch_updated_at();


create table if not exists public.kid_adventure_pack_answers (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references public.children(id) on delete cascade,
  country_slug  text not null,
  section       text not null,
  answers       jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(child_id, country_slug, section)
);

create index if not exists kapa_child_country_idx on public.kid_adventure_pack_answers (child_id, country_slug);

drop trigger if exists tg_kapa_touch on public.kid_adventure_pack_answers;
create trigger tg_kapa_touch
  before update on public.kid_adventure_pack_answers
  for each row execute function public.tg_touch_updated_at();


-- ── COUNTRY VISITS ───────────────────────────────────────────────
-- Created the first time a child opens an assigned pack for a
-- country. Drives the world-map "country unlocked" state and the
-- per-country passport pages.
create table if not exists public.child_country_visits (
  id                uuid primary key default gen_random_uuid(),
  child_id          uuid not null references public.children(id) on delete cascade,
  country_slug      text not null,
  first_visit_date  date not null default current_date,
  created_at        timestamptz not null default now(),
  unique(child_id, country_slug)
);

create index if not exists ccv_child_idx on public.child_country_visits (child_id);


-- ── STAMPS ───────────────────────────────────────────────────────
-- The gamification core. One row per stamp earned. Multiple stamps
-- of the same type per child are allowed (e.g. BRAVE_EATER per
-- country). status carries the full lifecycle: a system-suggested
-- stamp on a child with stamp_auto_approve=false lands as
-- 'suggested', then the parent approves -> 'awarded' or
-- rejects -> 'rejected'. earned_at is when the underlying event
-- happened; decided_at is when the parent acted on a suggestion.
create table if not exists public.stamps (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references public.children(id) on delete cascade,
  type            text not null check (type in (
                    'BRAVE_EATER',
                    'LOCAL_LINGO',
                    'STEP_CHAMP',
                    'ADVENTURE_PACK_COMPLETE',
                    'EXPLORER_DAY',
                    'CULTURE_SPOTTER',
                    'NATURE_LOVER',
                    'BRAVE_TRAVELLER',
                    'WATER_ADVENTURER',
                    'EARLY_BIRD'
                  )),
  country_slug    text,           -- nullable: some stamps (e.g. BRAVE_TRAVELLER) aren't country-specific
  note            text check (note is null or length(note) <= 500),
  awarded_by      text not null default 'system'
                  check (awarded_by in ('system','parent','self')),
  status          text not null default 'awarded'
                  check (status in ('suggested','awarded','rejected')),
  earned_at       timestamptz not null default now(),
  decided_at      timestamptz,    -- set when a suggestion is approved/rejected
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists stamps_child_idx on public.stamps (child_id);
create index if not exists stamps_child_country_idx on public.stamps (child_id, country_slug);
create index if not exists stamps_pending_idx on public.stamps (child_id, status) where status = 'suggested';

drop trigger if exists tg_stamps_touch on public.stamps;
create trigger tg_stamps_touch
  before update on public.stamps
  for each row execute function public.tg_touch_updated_at();


-- ── JOURNAL ENTRIES ──────────────────────────────────────────────
-- One row per memory captured. Country-scoped is optional (some
-- entries are about travel days, flights, etc. that aren't tied to
-- one country). created_by tracks whether the entry came from the
-- kid in their QR session or the parent editing through the
-- dashboard.
create table if not exists public.journal_entries (
  id                uuid primary key default gen_random_uuid(),
  child_id          uuid not null references public.children(id) on delete cascade,
  country_slug      text,
  text              text check (text is null or length(text) <= 5000),
  emoji_rating      text check (emoji_rating is null or length(emoji_rating) <= 16),
  created_by        text not null check (created_by in ('kid','parent')),
  -- True if a parent has edited an entry that was originally written
  -- by the kid. Used to flag transparency on the kid's view.
  parent_edited     boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists journal_child_idx on public.journal_entries (child_id, created_at desc);
create index if not exists journal_child_country_idx on public.journal_entries (child_id, country_slug, created_at desc);

drop trigger if exists tg_journal_touch on public.journal_entries;
create trigger tg_journal_touch
  before update on public.journal_entries
  for each row execute function public.tg_touch_updated_at();


-- ── FLIGHTS ──────────────────────────────────────────────────────
-- Family-level flight log: kids share flights, so we don't duplicate
-- per child. When a flight is added, the API route fans out a
-- BRAVE_TRAVELLER stamp for every currently-active child.
create table if not exists public.flights (
  id              uuid primary key default gen_random_uuid(),
  parent_id       uuid not null references auth.users(id) on delete cascade,
  from_airport    text not null check (length(from_airport) between 1 and 60),
  to_airport      text not null check (length(to_airport) between 1 and 60),
  flight_date     date not null,
  duration_mins   int check (duration_mins is null or duration_mins between 1 and 24*60),
  notes           text check (notes is null or length(notes) <= 500),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists flights_parent_idx on public.flights (parent_id, flight_date desc);

drop trigger if exists tg_flights_touch on public.flights;
create trigger tg_flights_touch
  before update on public.flights
  for each row execute function public.tg_touch_updated_at();


-- ═══════════════════════════════════════
--  ROW LEVEL SECURITY
--  Parents access via auth.uid(). Kids never authenticate so kid-
--  facing API routes use the service role and validate qr_token
--  themselves.
-- ═══════════════════════════════════════

alter table public.children                    enable row level security;
alter table public.child_pack_assignments      enable row level security;
alter table public.kid_adventure_pack_sessions enable row level security;
alter table public.kid_adventure_pack_answers  enable row level security;
alter table public.child_country_visits        enable row level security;
alter table public.stamps                      enable row level security;
alter table public.journal_entries             enable row level security;
alter table public.flights                     enable row level security;

-- children: parent reads/writes their own children.
drop policy if exists "children_parent_access" on public.children;
create policy "children_parent_access" on public.children
  for all using (auth.uid() = parent_id) with check (auth.uid() = parent_id);

-- child-keyed tables: parent reaches them via children ownership.
-- One template, applied to every child-scoped table.

drop policy if exists "cpa_parent_access" on public.child_pack_assignments;
create policy "cpa_parent_access" on public.child_pack_assignments
  for all using (
    exists (select 1 from public.children c where c.id = child_pack_assignments.child_id and c.parent_id = auth.uid())
  ) with check (
    exists (select 1 from public.children c where c.id = child_pack_assignments.child_id and c.parent_id = auth.uid())
  );

drop policy if exists "kaps_parent_access" on public.kid_adventure_pack_sessions;
create policy "kaps_parent_access" on public.kid_adventure_pack_sessions
  for all using (
    exists (select 1 from public.children c where c.id = kid_adventure_pack_sessions.child_id and c.parent_id = auth.uid())
  ) with check (
    exists (select 1 from public.children c where c.id = kid_adventure_pack_sessions.child_id and c.parent_id = auth.uid())
  );

drop policy if exists "kapa_parent_access" on public.kid_adventure_pack_answers;
create policy "kapa_parent_access" on public.kid_adventure_pack_answers
  for all using (
    exists (select 1 from public.children c where c.id = kid_adventure_pack_answers.child_id and c.parent_id = auth.uid())
  ) with check (
    exists (select 1 from public.children c where c.id = kid_adventure_pack_answers.child_id and c.parent_id = auth.uid())
  );

drop policy if exists "ccv_parent_access" on public.child_country_visits;
create policy "ccv_parent_access" on public.child_country_visits
  for all using (
    exists (select 1 from public.children c where c.id = child_country_visits.child_id and c.parent_id = auth.uid())
  ) with check (
    exists (select 1 from public.children c where c.id = child_country_visits.child_id and c.parent_id = auth.uid())
  );

drop policy if exists "stamps_parent_access" on public.stamps;
create policy "stamps_parent_access" on public.stamps
  for all using (
    exists (select 1 from public.children c where c.id = stamps.child_id and c.parent_id = auth.uid())
  ) with check (
    exists (select 1 from public.children c where c.id = stamps.child_id and c.parent_id = auth.uid())
  );

drop policy if exists "journal_parent_access" on public.journal_entries;
create policy "journal_parent_access" on public.journal_entries
  for all using (
    exists (select 1 from public.children c where c.id = journal_entries.child_id and c.parent_id = auth.uid())
  ) with check (
    exists (select 1 from public.children c where c.id = journal_entries.child_id and c.parent_id = auth.uid())
  );

drop policy if exists "flights_parent_access" on public.flights;
create policy "flights_parent_access" on public.flights
  for all using (auth.uid() = parent_id) with check (auth.uid() = parent_id);
