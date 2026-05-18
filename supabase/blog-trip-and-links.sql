-- ═══════════════════════════════════════
--  JFT, BLOG: trip date, target read time, multi-links
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Adds three columns to blog_posts:
--   - trip_date       (date the family actually visited; nullable)
--   - target_minutes  (intended read time the AI was asked to hit; 1..20)
--   - links           (jsonb array of {url, label} pairs; replaces
--                       the single place_link field over time)
--
--  place_link stays in the schema for back-compat; rowToView migrates
--  it into `links` on read when `links` is empty.
-- ═══════════════════════════════════════

alter table public.blog_posts
  add column if not exists trip_date      date,
  add column if not exists target_minutes smallint
    check (target_minutes is null or (target_minutes between 1 and 20)),
  add column if not exists links          jsonb not null default '[]'::jsonb;

create index if not exists blog_posts_trip_date_idx on public.blog_posts (trip_date desc);
