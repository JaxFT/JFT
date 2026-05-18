-- ═══════════════════════════════════════
--  JFT — GUIDES: PDF download path
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Adds pdf_path to public.guides — the storage path of the
--  downloadable PDF version (uploaded manually by an admin after
--  print-to-PDF from /admin/guides/[id]/print). Stored in the
--  existing guide-files bucket, conventionally at web/<slug>.pdf.
--  NULL = no PDF uploaded yet.
-- ═══════════════════════════════════════

alter table public.guides
  add column if not exists pdf_path text;
