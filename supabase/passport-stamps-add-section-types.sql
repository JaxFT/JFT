-- ═══════════════════════════════════════
--  JFT, Passport stamps: 7 new section-specific types
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Every Adventure Pack section now earns its own stamp on completion.
--  We had food → BRAVE_EATER and language → LOCAL_LINGO already; this
--  fills in the other 7 sections (map, money, geography, scavenger,
--  senses, stories, convo). Plus we keep the existing 10 in case any
--  are already in use.
-- ═══════════════════════════════════════

alter table public.stamps drop constraint if exists stamps_type_check;
alter table public.stamps add constraint stamps_type_check
  check (type in (
    -- Existing
    'BRAVE_EATER',
    'LOCAL_LINGO',
    'STEP_CHAMP',
    'ADVENTURE_PACK_COMPLETE',
    'EXPLORER_DAY',
    'CULTURE_SPOTTER',
    'NATURE_LOVER',
    'BRAVE_TRAVELLER',
    'WATER_ADVENTURER',
    'EARLY_BIRD',
    -- New: one per Adventure Pack section
    'MAP_READER',          -- map mission
    'MONEY_CHANGER',       -- money mission
    'GEOGRAPHY_GENIUS',    -- geography mission
    'SCAVENGER_HUNTER',    -- scavenger mission
    'SENSE_SEEKER',        -- senses mission
    'STORY_KEEPER',        -- stories mission
    'FAMILY_CHATTERBOX'    -- convo mission
  ));
