-- Unified moderation queue across the three comment-like surfaces
-- (blog comments, recommendation comments, guestbook entries). A row
-- is logged for EVERY new comment (not just flagged ones) — this is
-- the "daily rundown" Bec/Oli check, plus the page owner's flag
-- button escalates a specific one. body_snapshot keeps a copy of the
-- text so a review is still possible even if the source row is later
-- edited or deleted by its author. No RLS policies at all on purpose
-- — this table is never read or written by a normal client, only via
-- service-role admin API routes.

create table if not exists public.moderation_items (
  id               uuid primary key default gen_random_uuid(),
  content_type     text not null check (content_type in ('blog_comment', 'recommendation_comment', 'guestbook_entry')),
  content_id       uuid not null,
  author_user_id   uuid references auth.users(id) on delete set null,
  body_snapshot    text not null,
  context_label    text not null,
  context_link     text not null,
  flagged          boolean not null default false,
  flagged_by       uuid references auth.users(id) on delete set null,
  flagged_at       timestamptz,
  reviewed_at      timestamptz,
  reviewed_by      uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists moderation_items_pending_idx
  on public.moderation_items (created_at desc) where reviewed_at is null;
create unique index if not exists moderation_items_content_uidx
  on public.moderation_items (content_type, content_id);

alter table public.moderation_items enable row level security;
