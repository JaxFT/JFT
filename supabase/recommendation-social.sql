-- Upvote/downvote and comments on recommendations. Same shape and RLS
-- pattern as blog-comments-likes.sql (composite-key vote table, plain
-- comments table), just members-only (auth.uid() is not null) to
-- match recommendations itself rather than public-select.

create table if not exists public.recommendation_votes (
  user_id            uuid not null references auth.users(id) on delete cascade,
  recommendation_id  uuid not null references public.recommendations(id) on delete cascade,
  value              smallint not null check (value in (-1, 1)),
  voted_at           timestamptz not null default now(),
  primary key (user_id, recommendation_id)
);
create index if not exists recommendation_votes_rec_idx on public.recommendation_votes (recommendation_id);

alter table public.recommendation_votes enable row level security;
drop policy if exists "recommendation_votes_select" on public.recommendation_votes;
create policy "recommendation_votes_select" on public.recommendation_votes
  for select using (auth.uid() is not null);
drop policy if exists "recommendation_votes_insert" on public.recommendation_votes;
create policy "recommendation_votes_insert" on public.recommendation_votes
  for insert with check (auth.uid() = user_id);
drop policy if exists "recommendation_votes_update" on public.recommendation_votes;
create policy "recommendation_votes_update" on public.recommendation_votes
  for update using (auth.uid() = user_id);
drop policy if exists "recommendation_votes_delete" on public.recommendation_votes;
create policy "recommendation_votes_delete" on public.recommendation_votes
  for delete using (auth.uid() = user_id);

create table if not exists public.recommendation_comments (
  id                 uuid primary key default gen_random_uuid(),
  recommendation_id  uuid not null references public.recommendations(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  body               text not null check (char_length(body) between 1 and 500),
  created_at         timestamptz not null default now()
);
create index if not exists recommendation_comments_rec_idx on public.recommendation_comments (recommendation_id, created_at);

alter table public.recommendation_comments enable row level security;
drop policy if exists "recommendation_comments_select" on public.recommendation_comments;
create policy "recommendation_comments_select" on public.recommendation_comments
  for select using (auth.uid() is not null);
drop policy if exists "recommendation_comments_insert" on public.recommendation_comments;
create policy "recommendation_comments_insert" on public.recommendation_comments
  for insert with check (auth.uid() = user_id);
drop policy if exists "recommendation_comments_delete" on public.recommendation_comments;
create policy "recommendation_comments_delete" on public.recommendation_comments
  for delete using (auth.uid() = user_id);
