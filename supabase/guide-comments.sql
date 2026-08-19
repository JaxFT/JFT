-- Guide comments + comment likes, direct mirror of
-- supabase/blog-comments-likes.sql (blog_comments/blog_comment_likes)
-- applied to guides instead. guide_slug is plain text, not a foreign
-- key, same as blog_comments.post_slug and funnel_events.guide_slug —
-- covers both legacy PDF guides (products table) and web guides in
-- one namespace since /guides/[slug] routes across both.
--
-- Same RLS shape as blog comments: anyone can SELECT, only signed-in
-- users can INSERT against their own user_id, users delete their own
-- rows, admins delete via service role.

create table if not exists public.guide_comments (
  id          uuid        primary key default gen_random_uuid(),
  guide_slug  text        not null,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  body        text        not null check (char_length(body) between 1 and 2000),
  -- One-level reply threads, same flattening rule as blog_comments:
  -- NULL = top-level comment, otherwise points at the top-level
  -- comment it replies to.
  parent_id   uuid        references public.guide_comments(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists guide_comments_slug_idx   on public.guide_comments(guide_slug, created_at desc);
create index if not exists guide_comments_user_idx   on public.guide_comments(user_id);
create index if not exists guide_comments_parent_idx on public.guide_comments(parent_id);

alter table public.guide_comments enable row level security;

drop policy if exists "guide_comments_select_all" on public.guide_comments;
drop policy if exists "guide_comments_insert_own" on public.guide_comments;
drop policy if exists "guide_comments_update_own" on public.guide_comments;
drop policy if exists "guide_comments_delete_own" on public.guide_comments;

create policy "guide_comments_select_all"
  on public.guide_comments for select using (true);
create policy "guide_comments_insert_own"
  on public.guide_comments for insert with check (auth.uid() = user_id);
create policy "guide_comments_update_own"
  on public.guide_comments for update using (auth.uid() = user_id);
create policy "guide_comments_delete_own"
  on public.guide_comments for delete using (auth.uid() = user_id);

-- ── COMMENT LIKES ─────────────────────────────────────────────────
create table if not exists public.guide_comment_likes (
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  comment_id  uuid        not null references public.guide_comments(id) on delete cascade,
  liked_at    timestamptz not null default now(),
  primary key (user_id, comment_id)
);
create index if not exists guide_comment_likes_comment_idx on public.guide_comment_likes(comment_id);

alter table public.guide_comment_likes enable row level security;

drop policy if exists "guide_comment_likes_select_all" on public.guide_comment_likes;
drop policy if exists "guide_comment_likes_insert_own" on public.guide_comment_likes;
drop policy if exists "guide_comment_likes_delete_own" on public.guide_comment_likes;

create policy "guide_comment_likes_select_all"
  on public.guide_comment_likes for select using (true);
create policy "guide_comment_likes_insert_own"
  on public.guide_comment_likes for insert with check (auth.uid() = user_id);
create policy "guide_comment_likes_delete_own"
  on public.guide_comment_likes for delete using (auth.uid() = user_id);
