-- ═══════════════════════════════════════
--  JFT, GUIDES: editable intro section
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Adds intro_markdown, a small editable section that appears between
--  the cover hero and the table of contents on a guide. Lives separately
--  from body_markdown so Bec can update it without re-importing the
--  whole guide (e.g. "we've been back twice and added new sections on
--  Tangalle and the east coast"). Default empty, existing guides keep
--  rendering exactly as they do today until the admin adds an intro
--  via the preview editor.
-- ═══════════════════════════════════════

alter table public.guides
  add column if not exists intro_markdown text not null default '';
