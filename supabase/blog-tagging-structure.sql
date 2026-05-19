-- Blog tagging structure: travel stage + destination country + topic buckets.
--
-- Three new structured fields on every blog post, in addition to the existing
-- free-form `tags` array and the `category` column (now surfaced in the UI as
-- "Post type", same enum kept under the hood for the affiliate-link wizard).
--
--   travel_stages       — text[] of up to 2 from a fixed list (dreaming, planning,
--                         on-the-road, long-term, worldschooling). Required at
--                         publish time, enforced in the wizard not in the DB.
--   destination_country — single country slug from PACK_META, or null for posts
--                         that aren't tied to one country. Required at publish.
--   topics              — text[] of up to 3 from a fixed list of 10 (money,
--                         food, accommodation, transport, schooling, safety,
--                         packing, activities, long-term-life, family-dynamics).
--                         Optional.
--
-- GIN indexes on the array columns so the /blog filter doesn't table-scan once
-- the catalogue grows.

alter table blog_posts
  add column if not exists travel_stages       text[] not null default '{}',
  add column if not exists destination_country text,
  add column if not exists topics              text[] not null default '{}';

create index if not exists blog_posts_travel_stages_gin
  on blog_posts using gin (travel_stages);

create index if not exists blog_posts_topics_gin
  on blog_posts using gin (topics);

create index if not exists blog_posts_destination_country_idx
  on blog_posts (destination_country);

-- Backfill the one existing seeded post (Penang restaurant). Idempotent —
-- only runs if the row exists AND the fields haven't been set by hand.
update blog_posts
set
  travel_stages       = case when array_length(travel_stages, 1) is null then array['on-the-road']                          else travel_stages       end,
  destination_country = case when destination_country is null            then 'malaysia'                                    else destination_country end,
  topics              = case when array_length(topics, 1) is null        then array['food', 'long-term-life']               else topics              end
where slug = 'the-best-family-meal-weve-had-in-penang-and-it-cost-less-than-8'
   or slug = 'best-family-meal-penang'
   or title ilike '%penang%';
