-- ═══════════════════════════════════════
--  JFT, BLOG EXTRAS (Supabase)
--  Run AFTER blog-posts.sql in:
--  Supabase Dashboard > SQL Editor
--
--  Adds:
--   - category / place_name / place_link columns to blog_posts
--   - blog_auto_links: curated phrase -> URL overrides used to
--     auto-link recurring phrases inside published post bodies.
-- ═══════════════════════════════════════

-- ── BLOG_POSTS: new columns ───────────
alter table public.blog_posts
  add column if not exists category   text
    check (category in ('accommodation','restaurant','bar','activity','general')),
  add column if not exists place_name text,
  add column if not exists place_link text;

create index if not exists blog_posts_category_idx on public.blog_posts (category);

-- ── BLOG_AUTO_LINKS ───────────────────
-- Phrase -> destination URL. When a published post body is rendered,
-- the first occurrence of `phrase` in the body becomes a link to `url`.
-- Phrases here take precedence over the tag-derived auto-links.
create table if not exists public.blog_auto_links (
  id          uuid primary key default gen_random_uuid(),
  phrase      text not null,
  url         text not null,
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Case-insensitive uniqueness on phrase
create unique index if not exists blog_auto_links_phrase_lower_idx
  on public.blog_auto_links (lower(phrase));

drop trigger if exists blog_auto_links_updated_at on public.blog_auto_links;
create trigger blog_auto_links_updated_at before update on public.blog_auto_links
  for each row execute procedure public.set_updated_at();

-- ── RLS ───────────────────────────────
alter table public.blog_auto_links enable row level security;

-- Anyone can read (rendered into public post bodies)
drop policy if exists "blog_auto_links_select_all" on public.blog_auto_links;
create policy "blog_auto_links_select_all" on public.blog_auto_links
  for select using (true);

-- Only admins can write
drop policy if exists "blog_auto_links_admin_insert" on public.blog_auto_links;
create policy "blog_auto_links_admin_insert" on public.blog_auto_links
  for insert with check (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "blog_auto_links_admin_update" on public.blog_auto_links;
create policy "blog_auto_links_admin_update" on public.blog_auto_links
  for update using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );

drop policy if exists "blog_auto_links_admin_delete" on public.blog_auto_links;
create policy "blog_auto_links_admin_delete" on public.blog_auto_links
  for delete using (
    (auth.jwt() ->> 'email') in ('luckbao@icloud.com','jaxfamilytravels7@gmail.com')
  );
