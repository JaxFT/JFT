-- Travel Profile: one optional external link (label + URL), the
-- MySpace-era "my website" field — someone's own site, blog,
-- Instagram, a business like WayStaq, whatever they want to point
-- to. Single link on purpose, same "less is more" restraint as the
-- rest of this feature, not a links-in-bio list.

alter table public.travel_profiles
  add column if not exists link_label text,
  add column if not exists link_url text;
