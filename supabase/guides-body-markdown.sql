-- ═══════════════════════════════════════
--  JFT, GUIDES: single-document body
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Adds two columns to public.guides:
--   - body_markdown   the whole guide as one markdown doc (new model)
--   - preview_percent how much of body_markdown is shown to non-buyers
--                     (default 25%, same approach as blog posts)
--
--  Existing block-based guides (e.g. Sri Lanka) keep working, the
--  reader prefers body_markdown when present and falls back to
--  sections.blocks when it's empty.
-- ═══════════════════════════════════════

alter table public.guides
  add column if not exists body_markdown   text     not null default '',
  add column if not exists preview_percent smallint not null default 25
    check (preview_percent between 0 and 100);
