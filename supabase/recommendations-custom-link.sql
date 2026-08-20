-- Optional custom link + label on a recommendation, e.g. label "Book
-- here" pointing at a GetYourGuide booking page, or "See menu"
-- pointing at a restaurant's menu PDF. Distinct from google_maps_url
-- (always literally a Google Maps link) — this can be any external
-- URL. Always set together or not at all: the API won't save a label
-- without a link, or a link without a label (falls back to a generic
-- label so the button always has something sensible to say).

alter table public.recommendations
  add column if not exists link_url   text,
  add column if not exists link_label text;
