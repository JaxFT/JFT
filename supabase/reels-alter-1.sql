-- Migration: add posting location/time fields + simplify audio_type
-- Run in: Supabase Dashboard > SQL Editor

-- New columns
alter table public.reels
  add column if not exists posted_country      text,
  add column if not exists posted_time_local   text,
  add column if not exists posted_time_gmt     text,
  add column if not exists content_scope       text check (content_scope in ('general','country_specific')),
  add column if not exists content_country     text;

-- Drop old audio_type constraint and replace with simplified two-option one.
-- Existing rows with old values (original, trending_sound, music, silent)
-- are nulled out first so the new constraint doesn't reject them.
update public.reels
  set audio_type = null
  where audio_type not in ('voiceover','audio_only');

alter table public.reels
  drop constraint if exists reels_audio_type_check;

alter table public.reels
  add constraint reels_audio_type_check
  check (audio_type in ('voiceover','audio_only'));
