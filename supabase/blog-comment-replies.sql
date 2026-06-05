-- Threaded replies for blog comments (one level deep).
--
-- Adds a self-referential parent_id to blog_comments. Top-level
-- comments have parent_id = NULL; replies point at the comment they
-- belong to. We flatten to a single level in the API: a reply to a
-- reply is stored against the same top-level parent, so threads never
-- nest deeper than one level (YouTube/Instagram style).
--
-- Replies cascade-delete with their parent. RLS is unchanged — the
-- existing blog_comments policies already gate insert/select/delete
-- regardless of parent_id.

alter table public.blog_comments
  add column if not exists parent_id uuid
    references public.blog_comments(id) on delete cascade;

create index if not exists blog_comments_parent_idx
  on public.blog_comments(parent_id);
