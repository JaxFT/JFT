// Shared types for the Family Travel Passport.
// One file so DB shape, API contracts, and UI all use the same names.

export type PermissionMode = 'view' | 'guided' | 'creator'

export const PERMISSION_LABELS: Record<PermissionMode, string> = {
  view:    'View only',
  guided:  'Guided',
  creator: 'Creator',
}

export const PERMISSION_DESCRIPTIONS: Record<PermissionMode, string> = {
  view:    'Read-only passport. Safest. Best for toddlers and younger kids.',
  guided:  'Prompted journaling, emoji ratings, and pack progress. The recommended default.',
  creator: 'Free-form journal entries and stamp suggestions. Best for older kids.',
}

export type ChildRow = {
  id: string
  parent_id: string
  name: string
  avatar: string
  qr_token: string
  permission_mode: PermissionMode
  stamp_auto_approve: boolean
  // Default age tier for Adventure Pack content. 'younger' = up to
  // ~7, simpler stories and easier tile game; 'older' = full pack
  // content. Set on child create; editable from the profile.
  age_mode: 'younger' | 'older'
  created_at: string
  updated_at: string
}

export const AGE_MODE_LABELS: Record<'younger' | 'older', string> = {
  younger: 'Younger (up to about 7)',
  older:   'Older (about 7+)',
}

export const AGE_MODE_DESCRIPTIONS: Record<'younger' | 'older', string> = {
  younger: 'Easier tile game and simpler story sections. Best for early readers.',
  older:   'Full pack content including the older-only stories and tougher games.',
}

// Home country now lives on the parent profile and applies to
// every child in the family. Fetched via getParentProfile / the
// equivalent helper in passport-db.
export type ProfileHomeCountry = string | null

// A small set of friendly quick-pick avatars. The avatar input also
// accepts any emoji a parent types — these are just one-tap shortcuts.
export const AVATAR_OPTIONS = [
  '🐶', '🐱', '🦊', '🐻', '🦁', '🦄', '🐧', '🐯',
] as const

export type StampType =
  | 'BRAVE_EATER'
  | 'LOCAL_LINGO'
  | 'STEP_CHAMP'
  | 'ADVENTURE_PACK_COMPLETE'
  | 'EXPLORER_DAY'
  | 'CULTURE_SPOTTER'
  | 'NATURE_LOVER'
  | 'BRAVE_TRAVELLER'
  | 'WATER_ADVENTURER'
  | 'EARLY_BIRD'
  // One per Adventure Pack section (in addition to BRAVE_EATER and
  // LOCAL_LINGO above which already covered food + language).
  | 'MAP_READER'
  | 'MONEY_CHANGER'
  | 'GEOGRAPHY_GENIUS'
  | 'SCAVENGER_HUNTER'
  | 'ANIMAL_SPOTTER'
  | 'SENSE_SEEKER'
  | 'STORY_KEEPER'
  | 'FAMILY_CHATTERBOX'
  // Free-form stamp created by a parent (or, in a later phase, a
  // Creator-mode kid). Label/emoji/shape/ink come from custom_*
  // columns on the row rather than STAMP_META.
  | 'CUSTOM'

export type StampStatus = 'suggested' | 'awarded' | 'rejected'

// Stamps the system can auto-suggest based on pack interaction. The
// other types are manual-award-only.
export const AUTO_STAMP_TYPES: StampType[] = [
  'BRAVE_EATER',
  'LOCAL_LINGO',
  'ADVENTURE_PACK_COMPLETE',
  'BRAVE_TRAVELLER',
  'MAP_READER',
  'MONEY_CHANGER',
  'GEOGRAPHY_GENIUS',
  'SCAVENGER_HUNTER',
  'ANIMAL_SPOTTER',
  'SENSE_SEEKER',
  'STORY_KEEPER',
  'FAMILY_CHATTERBOX',
]

// Human-facing copy for every stamp type. Used on the stamps page,
// the manual-award picker, and the stamp-earned celebration.
// The `ink` colour is what the passport-stamp graphic uses for its
// double ring + text, so different stamp categories feel like they
// were inked with different official pads.
// CUSTOM stamps draw their real label/emoji/ink from the row's
// custom_* columns at render time. The placeholder entry below is
// only a fallback used by call sites that look up by type without a
// row in hand (eg. parent's stamp picker — which intentionally
// doesn't list CUSTOM anyway).
export const STAMP_META: Record<StampType, { emoji: string; label: string; description: string; ink: string }> = {
  BRAVE_EATER: {
    emoji: '🍜',
    label: 'Brave Eater',
    description: 'Tried a local food.',
    ink: '#9c2516', // deep red
  },
  LOCAL_LINGO: {
    emoji: '🗣️',
    label: 'Local Lingo',
    description: 'Attempted the local language.',
    ink: '#5b21b6', // royal purple
  },
  STEP_CHAMP: {
    emoji: '👟',
    label: 'Step Champ',
    description: 'Walked 10,000+ steps in a day.',
    ink: '#0f3a2a', // brand dark green
  },
  ADVENTURE_PACK_COMPLETE: {
    emoji: '🏆',
    label: 'Pack Complete',
    description: 'Finished every mission in an Adventure Pack.',
    ink: '#0f3a2a', // brand dark green
  },
  EXPLORER_DAY: {
    emoji: '🗺️',
    label: 'Explorer Day',
    description: 'Visited 3+ different places in one day.',
    ink: '#1e3a8a', // navy
  },
  CULTURE_SPOTTER: {
    emoji: '🏛️',
    label: 'Culture Spotter',
    description: 'Visited a museum, temple, or heritage site.',
    ink: '#5b21b6', // royal purple
  },
  NATURE_LOVER: {
    emoji: '🌿',
    label: 'Nature Lover',
    description: 'Spent the day outdoors in nature.',
    ink: '#15803d', // emerald
  },
  BRAVE_TRAVELLER: {
    emoji: '✈️',
    label: 'Brave Traveller',
    description: 'Took a flight.',
    ink: '#1e3a8a', // navy
  },
  WATER_ADVENTURER: {
    emoji: '🌊',
    label: 'Water Adventurer',
    description: 'Swam, snorkelled, paddled, or surfed.',
    ink: '#1e3a8a', // navy
  },
  EARLY_BIRD: {
    emoji: '🌅',
    label: 'Early Bird',
    description: 'Started a travel day before sunrise.',
    ink: '#9c2516', // deep red
  },
  // Section-completion stamps
  MAP_READER: {
    emoji: '🗺️',
    label: 'Map Reader',
    description: 'Found a country on the map.',
    ink: '#1e3a8a', // navy
  },
  MONEY_CHANGER: {
    emoji: '💰',
    label: 'Money Changer',
    description: 'Worked out the local money.',
    ink: '#0f3a2a', // brand dark green
  },
  GEOGRAPHY_GENIUS: {
    emoji: '🌍',
    label: 'Geography Genius',
    description: 'Matched the country\'s places.',
    ink: '#15803d', // emerald
  },
  SCAVENGER_HUNTER: {
    emoji: '🔎',
    label: 'Scavenger Hunter',
    description: 'Spotted things from the scavenger list.',
    ink: '#5b21b6', // royal purple
  },
  ANIMAL_SPOTTER: {
    emoji: '🐾',
    label: 'Animal Spotter',
    description: 'Spotted 3+ animals on the country\'s animal list.',
    ink: '#15803d', // emerald
  },
  SENSE_SEEKER: {
    emoji: '✨',
    label: 'Sense Seeker',
    description: 'Wrote down what you saw, heard, smelled, tasted, felt.',
    ink: '#9c2516', // deep red
  },
  STORY_KEEPER: {
    emoji: '📖',
    label: 'Story Keeper',
    description: 'Read the country\'s stories.',
    ink: '#5b21b6', // royal purple
  },
  FAMILY_CHATTERBOX: {
    emoji: '🎙️',
    label: 'Family Chatterbox',
    description: 'Did the family chat cards together.',
    ink: '#0f3a2a', // brand dark green
  },
  CUSTOM: {
    emoji: '✨',
    label: 'Custom',
    description: 'A one-off stamp created by a parent or kid.',
    ink: '#0f3a2a',
  },
}
