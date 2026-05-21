-- Homepage-featured flag on blog posts. Up to 3 posts can be marked
-- as featured at any time; the limit is enforced in the admin API.
-- Homepage hero stack reads the featured set instead of the latest 3.

alter table public.blog_posts
  add column if not exists homepage_featured boolean not null default false;

create index if not exists blog_posts_homepage_featured_idx
  on public.blog_posts (homepage_featured)
  where homepage_featured = true;
