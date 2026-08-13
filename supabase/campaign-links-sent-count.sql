-- How many times a campaign link was actually sent out (DMs, etc.) is
-- not something we can measure, only the admin knows it, so it's a
-- manually entered, editable number rather than a tracked event.
-- Null means "not entered yet" so the admin UI can show a dash
-- instead of a misleading 0.

alter table public.campaign_links
  add column if not exists sent_count integer;
