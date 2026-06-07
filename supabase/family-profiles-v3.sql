-- family_profiles v3: add home_currency.
--
-- Run on a database that already has the v2 schema. Non-destructive.
-- Used by the prompt builder so money prompts answer in the family's
-- home currency instead of USD.

alter table public.family_profiles
  add column if not exists home_currency text;
