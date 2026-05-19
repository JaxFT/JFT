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
  created_at: string
  updated_at: string
}

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

export type StampStatus = 'suggested' | 'awarded' | 'rejected'

// Stamps the system can auto-suggest based on pack interaction. The
// other 6 types in StampType are manual-award-only in v1.
export const AUTO_STAMP_TYPES: StampType[] = [
  'BRAVE_EATER',
  'LOCAL_LINGO',
  'ADVENTURE_PACK_COMPLETE',
  'BRAVE_TRAVELLER',
]

// Human-facing copy for every stamp type. Used on the stamps page,
// the manual-award picker, and the stamp-earned celebration.
export const STAMP_META: Record<StampType, { emoji: string; label: string; description: string }> = {
  BRAVE_EATER: {
    emoji: '🍜',
    label: 'Brave Eater',
    description: 'Tried a local food.',
  },
  LOCAL_LINGO: {
    emoji: '🗣️',
    label: 'Local Lingo',
    description: 'Attempted the local language.',
  },
  STEP_CHAMP: {
    emoji: '👟',
    label: 'Step Champ',
    description: 'Walked 10,000+ steps in a day.',
  },
  ADVENTURE_PACK_COMPLETE: {
    emoji: '🏆',
    label: 'Pack Complete',
    description: 'Finished every mission in an Adventure Pack.',
  },
  EXPLORER_DAY: {
    emoji: '🗺️',
    label: 'Explorer Day',
    description: 'Visited 3+ different places in one day.',
  },
  CULTURE_SPOTTER: {
    emoji: '🏛️',
    label: 'Culture Spotter',
    description: 'Visited a museum, temple, or heritage site.',
  },
  NATURE_LOVER: {
    emoji: '🌿',
    label: 'Nature Lover',
    description: 'Spent the day outdoors in nature.',
  },
  BRAVE_TRAVELLER: {
    emoji: '✈️',
    label: 'Brave Traveller',
    description: 'Took a flight.',
  },
  WATER_ADVENTURER: {
    emoji: '🌊',
    label: 'Water Adventurer',
    description: 'Swam, snorkelled, paddled, or surfed.',
  },
  EARLY_BIRD: {
    emoji: '🌅',
    label: 'Early Bird',
    description: 'Started a travel day before sunrise.',
  },
}
