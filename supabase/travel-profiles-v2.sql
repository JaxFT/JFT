-- Travel Profile, round 2: photo focal point, a background theme
-- picker, and a favourite country (with an optional "why").
--
-- hero_photo_focal_x/y mirrors blog_posts.cover_focal_x/y exactly
-- (see blog-cover-focal.sql) — percentages 0-100, default (50,50) is
-- centred, used as CSS object-position so the hero photo doesn't crop
-- awkwardly.
--
-- background_theme is a curated palette key, not a free hex value —
-- every option is a saturated-enough gradient that white text stays
-- legible on it (see background-themes.ts), so "pick your colour"
-- can't produce an illegible page.

alter table public.travel_profiles
  add column if not exists hero_photo_focal_x smallint not null default 50 check (hero_photo_focal_x between 0 and 100),
  add column if not exists hero_photo_focal_y smallint not null default 50 check (hero_photo_focal_y between 0 and 100),
  add column if not exists background_theme text not null default 'brand',
  add column if not exists fav_country_iso2 char(2),
  add column if not exists fav_country_why text;
