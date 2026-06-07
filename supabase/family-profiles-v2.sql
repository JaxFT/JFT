-- family_profiles v2: add home_country, and make travel_style multi-select.
--
-- Run this on an existing database that already has the v1
-- family_profiles table (from family-profiles.sql). Safe and
-- non-destructive except that any single travel_style value already
-- saved is wrapped into a one-element array.

alter table public.family_profiles
  add column if not exists home_country text;

-- travel_style: text -> text[]. Wrap any existing value into an array.
alter table public.family_profiles
  alter column travel_style drop default;

alter table public.family_profiles
  alter column travel_style type text[] using (
    case
      when travel_style is null or travel_style = '' then '{}'::text[]
      else array[travel_style]
    end
  );

alter table public.family_profiles
  alter column travel_style set default '{}';

update public.family_profiles set travel_style = '{}' where travel_style is null;

alter table public.family_profiles
  alter column travel_style set not null;
