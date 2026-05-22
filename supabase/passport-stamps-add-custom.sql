-- ═══════════════════════════════════════
--  JFT, Passport stamps: custom stamps + ANIMAL_SPOTTER catch-up
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run, all statements use IF NOT EXISTS / IF EXISTS.
--
--  Adds a 'CUSTOM' stamp type plus four override columns
--  (custom_label, custom_emoji, custom_shape, custom_ink) so parents
--  (and Creator-mode kids in a later phase) can create one-off
--  stamps with their own wording, picture, shape, and ink.
--
--  Also adds 'ANIMAL_SPOTTER' to the type check list, which was
--  present in the application code but missing from the DB
--  constraint, silently breaking the animal-spotting auto-stamp.
--
--  Existing rows are untouched; custom_* columns sit null on every
--  pre-existing stamp.
-- ═══════════════════════════════════════

-- 1. Custom override columns (nullable, populated only when type='CUSTOM')
ALTER TABLE public.stamps
  ADD COLUMN IF NOT EXISTS custom_label text,
  ADD COLUMN IF NOT EXISTS custom_emoji text,
  ADD COLUMN IF NOT EXISTS custom_shape text,
  ADD COLUMN IF NOT EXISTS custom_ink   text;

-- 2. Full type list. 18 system types + CUSTOM.
ALTER TABLE public.stamps DROP CONSTRAINT IF EXISTS stamps_type_check;
ALTER TABLE public.stamps ADD CONSTRAINT stamps_type_check
  CHECK (type IN (
    'BRAVE_EATER', 'LOCAL_LINGO', 'STEP_CHAMP', 'ADVENTURE_PACK_COMPLETE',
    'EXPLORER_DAY', 'CULTURE_SPOTTER', 'NATURE_LOVER', 'BRAVE_TRAVELLER',
    'WATER_ADVENTURER', 'EARLY_BIRD',
    'MAP_READER', 'MONEY_CHANGER', 'GEOGRAPHY_GENIUS', 'SCAVENGER_HUNTER',
    'ANIMAL_SPOTTER', 'SENSE_SEEKER', 'STORY_KEEPER', 'FAMILY_CHATTERBOX',
    'CUSTOM'
  ));

-- 3. Custom fields populated iff type='CUSTOM' (otherwise null).
--    Keeps system stamp rows clean and stops a CUSTOM row from
--    sneaking through without a label.
ALTER TABLE public.stamps DROP CONSTRAINT IF EXISTS stamps_custom_fields_check;
ALTER TABLE public.stamps ADD CONSTRAINT stamps_custom_fields_check
  CHECK (
    (type = 'CUSTOM'
      AND custom_label IS NOT NULL
      AND length(custom_label) BETWEEN 1 AND 60
      AND custom_emoji IS NOT NULL
      AND custom_shape IN ('circle','oval','rounded','flag','shield','hexagon')
      AND custom_ink   IS NOT NULL)
    OR
    (type <> 'CUSTOM'
      AND custom_label IS NULL
      AND custom_emoji IS NULL
      AND custom_shape IS NULL
      AND custom_ink   IS NULL)
  );

-- 4. Force PostgREST to pick up the schema change immediately so the
--    REST API stops returning "column not found in schema cache".
NOTIFY pgrst, 'reload schema';
