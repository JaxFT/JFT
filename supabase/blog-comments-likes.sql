-- Blog social features: usernames, comments, post likes, comment likes.
--
-- All tables RLS-enabled with a consistent policy shape:
--   • anyone can SELECT (so post pages render publicly)
--   • only signed-in users can INSERT against their own user_id
--   • users can DELETE their own rows; admins delete via service role
--
-- Usernames are stored lowercase on profiles. Validation (charset,
-- length, reserved words) lives in src/lib/usernames.ts so we can use
-- the same rules client- and server-side.

-- ── PROFILES: usernames + instagram ───────────────────────────────
alter table public.profiles
  add column if not exists username         text,
  add column if not exists instagram_handle text;

-- Case-insensitive uniqueness via a lowercase functional index. We
-- always store lowercase, but the index covers any drift.
create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null;

-- ── BLOG COMMENTS ─────────────────────────────────────────────────
create table if not exists public.blog_comments (
  id          uuid        primary key default gen_random_uuid(),
  post_slug   text        not null,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  body        text        not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists blog_comments_post_idx on public.blog_comments(post_slug, created_at desc);
create index if not exists blog_comments_user_idx on public.blog_comments(user_id);

alter table public.blog_comments enable row level security;

drop policy if exists "blog_comments_select_all"   on public.blog_comments;
drop policy if exists "blog_comments_insert_own"   on public.blog_comments;
drop policy if exists "blog_comments_update_own"   on public.blog_comments;
drop policy if exists "blog_comments_delete_own"   on public.blog_comments;

create policy "blog_comments_select_all"
  on public.blog_comments for select using (true);
create policy "blog_comments_insert_own"
  on public.blog_comments for insert with check (auth.uid() = user_id);
create policy "blog_comments_update_own"
  on public.blog_comments for update using (auth.uid() = user_id);
create policy "blog_comments_delete_own"
  on public.blog_comments for delete using (auth.uid() = user_id);

-- ── POST LIKES ────────────────────────────────────────────────────
create table if not exists public.blog_post_likes (
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  post_slug  text        not null,
  liked_at   timestamptz not null default now(),
  primary key (user_id, post_slug)
);
create index if not exists blog_post_likes_post_idx on public.blog_post_likes(post_slug);

alter table public.blog_post_likes enable row level security;

drop policy if exists "blog_post_likes_select_all" on public.blog_post_likes;
drop policy if exists "blog_post_likes_insert_own" on public.blog_post_likes;
drop policy if exists "blog_post_likes_delete_own" on public.blog_post_likes;

create policy "blog_post_likes_select_all"
  on public.blog_post_likes for select using (true);
create policy "blog_post_likes_insert_own"
  on public.blog_post_likes for insert with check (auth.uid() = user_id);
create policy "blog_post_likes_delete_own"
  on public.blog_post_likes for delete using (auth.uid() = user_id);

-- ── COMMENT LIKES ─────────────────────────────────────────────────
create table if not exists public.blog_comment_likes (
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  comment_id  uuid        not null references public.blog_comments(id) on delete cascade,
  liked_at    timestamptz not null default now(),
  primary key (user_id, comment_id)
);
create index if not exists blog_comment_likes_comment_idx on public.blog_comment_likes(comment_id);

alter table public.blog_comment_likes enable row level security;

drop policy if exists "blog_comment_likes_select_all" on public.blog_comment_likes;
drop policy if exists "blog_comment_likes_insert_own" on public.blog_comment_likes;
drop policy if exists "blog_comment_likes_delete_own" on public.blog_comment_likes;

create policy "blog_comment_likes_select_all"
  on public.blog_comment_likes for select using (true);
create policy "blog_comment_likes_insert_own"
  on public.blog_comment_likes for insert with check (auth.uid() = user_id);
create policy "blog_comment_likes_delete_own"
  on public.blog_comment_likes for delete using (auth.uid() = user_id);
