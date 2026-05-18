// Type definitions for the Adventure Packs feature.
// Each country pack conforms to AdventurePackData; the listing page
// uses AdventurePackMeta for the cards (no full content needed there).

export type AgeMode = 'younger' | 'older'

export const SECTION_KEYS = [
  'map',
  'language',
  'money',
  'food',
  'geography',
  'scavenger',
  'senses',
  'stories',
  'convo',
] as const

export type SectionKey = typeof SECTION_KEYS[number]

export const SECTION_LABELS: Record<SectionKey, string> = {
  map:       'Map mission',
  language:  'Language',
  money:     'Money',
  food:      'Food',
  geography: 'Geography',
  scavenger: 'Scavenger hunt',
  senses:    'Senses',
  stories:   'Stories',
  convo:     'Family chat',
}

// Emoji shown on the mission picker buttons.
export const SECTION_EMOJI: Record<SectionKey, string> = {
  map:       '🗺️',
  language:  '🗣️',
  money:     '💰',
  food:      '🍽️',
  geography: '🌍',
  scavenger: '🔎',
  senses:    '✨',
  stories:   '📖',
  convo:     '☕',
}

export interface Phrase {
  english: string
  nativeScript: string
  nativeLatin: string
  phonetic: string
  lang: string         // BCP-47, used to pick speech-synth voice
  olderOnly?: boolean
}

export interface FoodItem {
  emoji: string
  name: string
  description: string
}

export interface ScavengerItem {
  emoji: string
  label: string
  olderOnly?: boolean
}

export interface GeoMatch {
  place: string
  emoji: string
  description: string
}

export interface Story {
  location: string
  question: string
  body: string
  olderOnly?: boolean
  thinkingQuestion?: string
}

export interface MapQuestion {
  question: string
  answer: string
  olderOnly?: boolean
}

export interface ConvoQuestion {
  question: string
  olderOnly?: boolean
}

export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  recommendedBudget: number
  budgetNote: string
}

export interface SensesPlaceholders {
  smell: string
  hear: string
  taste: string
  feel: string
  see: string
}

export interface AdventurePackData {
  slug: string
  country: string
  flag: string
  isFree: boolean
  heroColour: string        // Tailwind bg class for the listing card hero
  currency: CurrencyInfo
  mapQuestions: MapQuestion[]
  phrases: Phrase[]
  foods: FoodItem[]
  scavengerItems: ScavengerItem[]
  geoMatches: GeoMatch[]
  senses: SensesPlaceholders
  stories: Story[]
  convoQuestions: ConvoQuestion[]
}

// Metadata for the listing page. Every country has a meta entry; only
// fully-built ones have a full AdventurePackData export.
export interface AdventurePackMeta {
  slug: string
  country: string
  flag: string
  isFree: boolean
  heroColour: string
  status: 'live' | 'coming-soon'
}

// ── Saved-state types ───────────────────────────────────────────
// Per-section answers blobs are stored as opaque jsonb. We type them
// in each Section component so the hook can stay generic.

export type SectionAnswers = Record<string, unknown>
export type AllAnswers = Record<SectionKey, SectionAnswers>
