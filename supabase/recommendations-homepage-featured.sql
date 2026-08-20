-- Lets an admin pin a recommendation so it always shows in the
-- "4 highlights" default view on /recommendations, instead of that
-- view being purely automatic (most recent per distinct country).
-- Mirrors blog_posts.homepage_featured (see blog-homepage-featured.sql)
-- — same idea, same cap-enforced-in-the-admin-API pattern, applied to
-- recommendations instead of blog posts. Cap is 4, see
-- MAX_RECOMMENDATIONS_FEATURED in src/components/recommendations/types.ts.

alter table public.recommendations
  add column if not exists homepage_featured boolean not null default false;

create index if not exists recommendations_homepage_featured_idx
  on public.recommendations (homepage_featured)
  where homepage_featured = true;
