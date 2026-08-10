-- Travel Profile: a dedicated Instagram handle, separate from the
-- generic link (link_label/link_url). Stored as a bare handle (no @,
-- no full URL) so it can get its own icon treatment on the public
-- page rather than looking like just another generic link.

alter table public.travel_profiles
  add column if not exists instagram_handle text;
