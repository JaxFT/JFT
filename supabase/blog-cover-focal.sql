-- ═══════════════════════════════════════
--  JFT — BLOG COVER FOCAL POINT
--  Run in: Supabase Dashboard > SQL Editor
--
--  Adds tunable focal-point coordinates for the cover image so it
--  doesn't crop awkwardly (half a head, half a cat) when shown at
--  fixed aspect ratios on the hero or blog card.
--  Values are percentages 0–100. Default (50,50) preserves the
--  current centred behaviour for existing posts.
-- ═══════════════════════════════════════

alter table public.blog_posts
  add column if not exists cover_focal_x smallint not null default 50 check (cover_focal_x between 0 and 100),
  add column if not exists cover_focal_y smallint not null default 50 check (cover_focal_y between 0 and 100);
