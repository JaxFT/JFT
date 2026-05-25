-- Per-post view counter, surfaced on the admin /admin/blog list so
-- we can see which posts are getting attention.
--
-- Counter lives on blog_posts directly (a bigint column) rather than
-- a separate events table — we only need totals on the admin screen,
-- not time-series data. Cloudflare Web Analytics already covers the
-- site-wide story.
--
-- Increment goes through a SECURITY DEFINER RPC because PostgREST
-- can't update a column to (column + 1) directly from the client SDK.
-- The function is granted to anon + authenticated so the public
-- /api/blog/posts/[slug]/view endpoint can call it; admin-side
-- filtering (skip increment when the viewer is an admin) happens in
-- the API route, not here.

alter table public.blog_posts
  add column if not exists view_count bigint not null default 0;

create or replace function public.increment_blog_post_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.blog_posts
  set view_count = coalesce(view_count, 0) + 1
  where slug = p_slug and status = 'published'
$$;

grant execute on function public.increment_blog_post_view(text) to anon, authenticated;
