-- Tracks whether the reviewing member has posted their own review to
-- Google Maps for this place — purely a personal checklist for the
-- admin "write reviews on Google" tool, never shown anywhere on the
-- public site.

alter table public.recommendations
  add column if not exists google_review_posted_at timestamptz;
