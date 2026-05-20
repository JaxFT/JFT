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
  'animals',
  'senses',
  'stories',
  'convo',
  'wordsearch',
  'tilepuzzle',
] as const

export type SectionKey = typeof SECTION_KEYS[number]

export const SECTION_LABELS: Record<SectionKey, string> = {
  map:        'Map mission',
  language:   'Language',
  money:      'Money',
  food:       'Food',
  geography:  'Geography',
  scavenger:  'Scavenger hunt',
  animals:    'Animal spotter',
  senses:     'Senses',
  stories:    'Stories',
  convo:      'Family chat',
  wordsearch: 'Word search',
  tilepuzzle: 'Flag puzzle',
}

// Emoji shown on the mission picker buttons.
export const SECTION_EMOJI: Record<SectionKey, string> = {
  map:        '🗺️',
  language:   '🗣️',
  money:      '💰',
  food:       '🍽️',
  geography:  '🌍',
  scavenger:  '🔎',
  animals:    '🐾',
  senses:     '✨',
  stories:    '📖',
  convo:      '☕',
  wordsearch: '🔠',
  tilepuzzle: '🧩',
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

// Country-specific animals to spot in the wild, on a farm or in the
// street. Spot 3+ to earn the Animal Spotter stamp.
export interface AnimalItem {
  emoji: string
  name: string
  description: string
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

// Local words (foods, places, things to spot) hidden in a tap-to-colour
// grid. The grid itself is generated at render time from the word list
// using a slug-seeded RNG, so the layout is stable per country without
// having to hand-craft each puzzle.
export interface WordSearchData {
  // 8–12 uppercase A–Z words. No spaces, punctuation, or accents.
  words: string[]
  // One-line intro shown above the grid (e.g. "French foods, places
  // and things to spot").
  hint: string
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
  iso2: string              // ISO 3166-1 alpha-2, drives the flag banner URL
  isFree: boolean
  heroColour: string        // fallback bg while the flag image loads
  currency: CurrencyInfo
  mapQuestions: MapQuestion[]
  phrases: Phrase[]
  foods: FoodItem[]
  scavengerItems: ScavengerItem[]
  geoMatches: GeoMatch[]
  senses: SensesPlaceholders
  stories: Story[]
  convoQuestions: ConvoQuestion[]
  // Animals are stored in a separate file (adventurePackAnimals.ts)
  // and merged in by `getPackData`, so the individual pack data
  // blocks don't have to inline 100+ lines of animal content. Always
  // populated (possibly to `[]`) by the time a Section component
  // sees the pack.
  animals?: AnimalItem[]
  // Word search is rolling out one country at a time. Packs without
  // a word list don't render the section in the picker and don't
  // count it toward pack completion.
  wordSearch?: WordSearchData
}

// Sections actually visible (and required for completion) for a given
// pack. Optional sections only count for countries whose data block /
// meta opts them in.
export function getPackSections(
  data: Pick<AdventurePackData, 'wordSearch'>,
  opts?: { hasTilePuzzle?: boolean },
): SectionKey[] {
  const hasTilePuzzle = !!opts?.hasTilePuzzle
  return SECTION_KEYS.filter(k => {
    if (k === 'wordsearch') return !!data.wordSearch
    if (k === 'tilepuzzle') return hasTilePuzzle
    return true
  })
}

// Continents we group packs by in the listing UIs.
export type Continent =
  | 'Europe'
  | 'Asia'
  | 'Africa'
  | 'North America'
  | 'South America'
  | 'Oceania'

// Display order for continent groupings (kid-facing).
export const CONTINENT_ORDER: Continent[] = [
  'Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania',
]

// Metadata for the listing page. Every country has a meta entry; only
// fully-built ones have a full AdventurePackData export.
export interface AdventurePackMeta {
  slug: string
  country: string
  flag: string
  iso2: string              // ISO 3166-1 alpha-2, drives the flag banner URL
  isFree: boolean
  heroColour: string        // fallback bg while the flag image loads
  status: 'live' | 'coming-soon'
  continent: Continent
  // Mirrors `data.wordSearch` presence so the kid tabs (which import
  // the lightweight meta, not the full data file) can compute the
  // correct missions-total per country without pulling the 4000-line
  // pack data into their Worker bundle. Update this when you add a
  // word-search list to the corresponding data block.
  hasWordSearch?: boolean
  // Toggle the flag-tile sliding puzzle on per-country. The puzzle
  // itself needs no pack data (it just slices the country flag from
  // flagcdn), but we still opt in country-by-country so the missions
  // count stays even per pack and so we can ship the puzzle to one
  // country at a time without surprising others.
  hasTilePuzzle?: boolean
}

// ── Saved-state types ───────────────────────────────────────────
// Per-section answers blobs are stored as opaque jsonb. We type them
// in each Section component so the hook can stay generic.

export type SectionAnswers = Record<string, unknown>
export type AllAnswers = Record<SectionKey, SectionAnswers>
