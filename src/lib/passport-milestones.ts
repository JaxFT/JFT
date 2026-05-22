// Derived "Traveler" milestones — virtual stamps the kid earns by
// crossing thresholds (visited 5 countries, tried food in 10, etc.).
// Not stored in the DB; computed at render time. Higher tiers REPLACE
// lower ones — crossing 10 makes the 5-tier badge disappear.
//
// Home country (if set) is excluded from "new countries explored"
// stats so a kid completing the pack for the country they live in
// gets the section stamps but no travel-milestone credit.

import { getPackMeta, getPackByIso2 } from './adventurePackMeta'
import type { CountryVisitRow, StampRow } from './passport-kid-db'

// Continent each pack country sits on. Turkey is split E/W in real
// life; we lean Europe here.
export const CONTINENT_BY_SLUG: Record<string, string> = {
  france:           'Europe',
  morocco:          'Africa',
  indonesia:        'Asia',
  thailand:         'Asia',
  malaysia:         'Asia',
  spain:            'Europe',
  portugal:         'Europe',
  'united-kingdom': 'Europe',
  japan:            'Asia',
  vietnam:          'Asia',
  cambodia:         'Asia',
  china:            'Asia',
  india:            'Asia',
  'sri-lanka':      'Asia',
  nepal:            'Asia',
  turkey:           'Europe',
  egypt:            'Africa',
}

const CONTINENT_EMOJI: Record<string, string> = {
  Europe:        '🏰',
  Asia:          '🏯',
  Africa:        '🐘',
  Americas:      '🦅',
  Oceania:       '🌊',
  Antarctica:    '🐧',
}

const CONTINENT_INK: Record<string, string> = {
  Europe:        '#1e3a8a',
  Asia:          '#9c2516',
  Africa:        '#15803d',
  Americas:      '#5b21b6',
  Oceania:       '#0f3a2a',
  Antarctica:    '#5a3a12',
}

// Visual variety: each milestone picks a stamp shape so the
// Global Stamps page doesn't feel like a wall of identical circles.
// We stick to clean geometric shapes — hand-rolled continent
// silhouettes never quite read right at stamp size, so each
// continent gets one of these shapes instead.
export type StampShape =
  | 'circle' | 'oval' | 'rounded' | 'shield' | 'star' | 'flag' | 'hexagon'

export type MilestoneStamp = {
  id: string
  emoji: string
  label: string
  description: string
  ink: string
  earnedAt: string | null
  shape: StampShape
}

const COUNTRY_THRESHOLDS    = [1, 5, 10, 15, 20, 30, 50]
const FOOD_THRESHOLDS       = [5, 10, 15, 20]
const CONTINENT_THRESHOLDS  = [2, 3, 4, 5, 6, 7]

function highestThreshold(count: number, thresholds: number[]): number | null {
  let best: number | null = null
  for (const t of thresholds) {
    if (count >= t) best = t
  }
  return best
}

function dateOfNth(timestamps: string[], n: number): string | null {
  if (n <= 0 || n > timestamps.length) return null
  const sorted = [...timestamps].sort()
  return sorted[n - 1] ?? null
}

export function computeMilestones(
  visits: CountryVisitRow[],
  stamps: StampRow[],
  homeCountryIso2: string | null,
): MilestoneStamp[] {
  const out: MilestoneStamp[] = []

  // Map the kid's home ISO 3166-1 code to a pack slug (if their home
  // country happens to be one of our 35 packs). If it isn't, every
  // visit counts as a new-country milestone — eg. a kid in Switzerland
  // visiting Morocco is a real trip away from home.
  const homePackSlug = getPackByIso2(homeCountryIso2)?.slug ?? null

  // Strip the home country from "new countries explored" data.
  const travelVisits = homePackSlug
    ? visits.filter(v => v.country_slug !== homePackSlug)
    : visits

  // ── First-country milestone is special: it uses the actual
  // country's flag and name. Only fires at exactly the 1-tier; higher
  // tiers fall through to the generic "X countries" badge.
  const visitsSorted = [...travelVisits].sort((a, b) =>
    a.first_visit_date < b.first_visit_date ? -1 : 1)
  const firstVisit = visitsSorted[0]
  const countryTier = highestThreshold(travelVisits.length, COUNTRY_THRESHOLDS)

  if (countryTier === 1 && firstVisit) {
    const meta = getPackMeta(firstVisit.country_slug)
    out.push({
      id: `first-country-${firstVisit.country_slug}`,
      emoji: meta?.flag ?? '🌍',
      label: meta ? `First new country · ${meta.country}` : 'First new country',
      description: 'Your very first stamp in the explorer\'s book.',
      ink: '#0f3a2a',
      earnedAt: firstVisit.first_visit_date,
      shape: 'flag',
    })
  } else if (countryTier && countryTier > 1) {
    out.push({
      id: `countries-${countryTier}`,
      emoji: '🌍',
      label: `${countryTier} countries`,
      description: `You've explored ${countryTier} different countries.`,
      ink: '#0f3a2a',
      earnedAt: dateOfNth(visitsSorted.map(v => v.first_visit_date), countryTier),
      shape: countryTier >= 20 ? 'hexagon' : countryTier >= 10 ? 'shield' : 'oval',
    })
  }

  // ── Tried food in N countries — also excludes home.
  const foodByCountry = new Map<string, string>()
  for (const s of stamps) {
    if (s.type !== 'BRAVE_EATER' || !s.country_slug) continue
    if (homePackSlug && s.country_slug === homePackSlug) continue
    const prev = foodByCountry.get(s.country_slug)
    if (!prev || s.earned_at < prev) foodByCountry.set(s.country_slug, s.earned_at)
  }
  const foodCount = foodByCountry.size
  const foodTier = highestThreshold(foodCount, FOOD_THRESHOLDS)
  if (foodTier) {
    out.push({
      id: `food-${foodTier}`,
      emoji: '🍜',
      label: `Brave eater · ${foodTier} countries`,
      description: `You've tried the local food in ${foodTier} different countries.`,
      ink: '#9c2516',
      earnedAt: dateOfNth(Array.from(foodByCountry.values()), foodTier),
      shape: foodTier >= 15 ? 'shield' : 'rounded',
    })
  }

  // ── Continent stamps and continent total: include home (the kid
  // physically lives on that continent, so it's been visited).
  const continentDates = new Map<string, string>()
  for (const v of visits) {
    const c = CONTINENT_BY_SLUG[v.country_slug]
    if (!c) continue
    const prev = continentDates.get(c)
    if (!prev || v.first_visit_date < prev) continentDates.set(c, v.first_visit_date)
  }
  // Each continent gets its own clean geometric shape so the badges
  // are visually distinct even when several show up side by side.
  const CONTINENT_SHAPE: Record<string, StampShape> = {
    Africa:     'shield',   // downward-tapered, the closest "geographic" feel
    Europe:     'oval',
    Asia:       'rounded',
    Americas:   'flag',
    Oceania:    'circle',
    Antarctica: 'hexagon',
  }
  for (const [continent, date] of continentDates) {
    out.push({
      id: `continent-${continent}`,
      emoji: CONTINENT_EMOJI[continent] ?? '🌍',
      label: `${continent} explorer`,
      description: `You've been to ${continent}.`,
      ink: CONTINENT_INK[continent] ?? '#5a3a12',
      earnedAt: date,
      shape: CONTINENT_SHAPE[continent] ?? 'shield',
    })
  }
  const continentTier = highestThreshold(continentDates.size, CONTINENT_THRESHOLDS)
  if (continentTier) {
    out.push({
      id: `continents-${continentTier}`,
      emoji: '🌎',
      label: `${continentTier} continents`,
      description: `You've been to ${continentTier} different continents.`,
      ink: '#5b21b6',
      earnedAt: dateOfNth(Array.from(continentDates.values()), continentTier),
      shape: 'hexagon',
    })
  }

  return out
}
