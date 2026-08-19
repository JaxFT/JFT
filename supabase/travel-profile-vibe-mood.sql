-- "Currently vibing to" (a lighter, textual take on the classic
-- MySpace profile song, no embedded audio) and "Mood" — both plain
-- free-text status lines shown under the bio. Emoji are typed via the
-- device's own keyboard, no custom picker needed.

alter table public.travel_profiles
  add column if not exists currently_vibing_to text,
  add column if not exists mood text;
