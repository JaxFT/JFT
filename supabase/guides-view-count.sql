-- Per-web-guide view counter, surfaced on the admin /admin/guides list
-- so we can see which guides are getting attention. Direct mirror of
-- supabase/blog-post-view-count.sql, including the SECURITY DEFINER RPC
-- so the public /api/web-guides/[slug]/view endpoint can call it
-- without RLS gymnastics.
--
-- Counter lives on guides directly (a bigint column) rather than a
-- separate events table, we only need totals on the admin screen, not
-- time-series data. Admin viewers are excluded in the API route.

alter table public.guides
  add column if not exists view_count bigint not null default 0;

create or replace function public.increment_guide_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.guides
  set view_count = coalesce(view_count, 0) + 1
  where slug = p_slug and status = 'published'
$$;

grant execute on function public.increment_guide_view(text) to anon, authenticated;
