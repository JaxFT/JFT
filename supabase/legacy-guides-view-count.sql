-- Per-legacy-PDF-guide view counter, surfaced on the admin /admin/guides
-- list so we can see which guides are getting attention, same as web
-- guides already do. Direct mirror of supabase/guides-view-count.sql,
-- targeting products (type = 'guide') instead of guides.

alter table public.products
  add column if not exists view_count bigint not null default 0;

create or replace function public.increment_legacy_guide_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products
  set view_count = coalesce(view_count, 0) + 1
  where slug = p_slug and type = 'guide' and active = true
$$;

grant execute on function public.increment_legacy_guide_view(text) to anon, authenticated;
