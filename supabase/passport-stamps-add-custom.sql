-- ═══════════════════════════════════════
--  JFT, Passport stamps: custom stamps
--  Run in: Supabase Dashboard > SQL Editor
--  Safe to re-run.
--
--  Adds a 'CUSTOM' stamp type plus four override columns
--  (custom_label, custom_emoji, custom_shape, custom_ink) so parents
--  (and Creator-mode kids in a later phase) can create one-off
--  stamps with their own wording, picture, shape, and ink. The JFT
--  issuer mark on the stamp face stays fixed, so there's no
--  override for that.
--
--  Existing rows are untouched; custom_* columns sit null on every
--  pre-existing stamp.
-- ═══════════════════════════════════════

-- 1. Extend the type CHECK to allow 'CUSTOM'
alter table public.stamps drop constraint if exists stamps_type_check;
alter table public.stamps add constraint stamps_type_check
  check (type in (
    -- Existing 17 system types
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
    'MAP_READER',
    'MONEY_CHANGER',
    'GEOGRAPHY_GENIUS',
    'SCAVENGER_HUNTER',
    'SENSE_SEEKER',
    'STORY_KEEPER',
    'FAMILY_CHATTERBOX',
    -- New: parent/kid-created stamp
    'CUSTOM'
  ));

-- 2. Add the override columns
alter table public.stamps
  add column if not exists custom_label text,
  add column if not exists custom_emoji text,
  add column if not exists custom_shape text,
  add column if not exists custom_ink   text;

-- 3. Custom fields must be populated for CUSTOM, null for the rest.
--    Keeps data clean: a system stamp can't accidentally store a
--    label, and a custom stamp can't ship without a label.
alter table public.stamps drop constraint if exists stamps_custom_fields_check;
alter table public.stamps add constraint stamps_custom_fields_check
  check (
    (type = 'CUSTOM'
      and custom_label is not null
      and length(custom_label) between 1 and 60
      and custom_emoji is not null
      and custom_shape in ('circle','oval','rounded','flag','shield','hexagon')
      and custom_ink   is not null)
    or
    (type <> 'CUSTOM'
      and custom_label is null
      and custom_emoji is null
      and custom_shape is null
      and custom_ink   is null)
  );
