-- Pre-generated guide download files live here.
--
-- We render the self-contained HTML in the admin's browser (one-time
-- per publish, where there's no 10ms CPU budget) and upload to this
-- bucket. The user-facing download endpoint then just fetches the
-- file and streams it — milliseconds of work, no inlining required.
--
-- File path convention: `{guide-slug}.html`. Overwrite on every
-- regeneration.
--
-- Bucket is PRIVATE — files must be served through our /api endpoint
-- (which checks the Stripe session_id or auth) rather than directly
-- via a public Supabase URL. The service-role key on the server is
-- the only thing that reads/writes here.

insert into storage.buckets (id, name, public)
values ('guide-downloads', 'guide-downloads', false)
on conflict (id) do nothing;
