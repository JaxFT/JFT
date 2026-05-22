// Derived "Traveler" milestones — virtual stamps the kid earns by
// crossing thresholds (visited 5 countries, tried food in 10, etc.).
// Not stored in the DB; computed at render time. Higher tiers REPLACE
// lower ones — crossing 10 makes the 5-tier badge disappear.
//
// Home country (if set) is excluded from "new countries explored"
// stats so a kid completing the pack for the country they live in
// gets the section stamps but no travel-milestone credit.

import { getPackMeta, getPackByIso2 } from './adventurePackMeta'
import { getCountryByIso2 } from './countries'
import type { CountryVisitRow, StampRow } from './passport-kid-db'

// countries.ts splits the Americas into 'North America' / 'South
// America'; we merge them back to 'Americas' for milestone-badge
// purposes so a kid in Mexico and a kid in Brazil both contribute
// to the same continent badge.
function continentFor(iso2: string): string | null {
  const country = getCountryByIso2(iso2)
  if (!country) return null
  const c = country.continent
  if (c === 'North America' || c === 'South America') return 'Americas'
  return c
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

  // Home is excluded from "new countries explored" stats so a kid
  // completing the pack for their home country doesn't get a travel
  // milestone for it.
  const homeIso = (homeCountryIso2 ?? '').toLowerCase() || null
  const homePackSlug = getPackByIso2(homeIso)?.slug ?? null

  // Strip the home country from "new countries explored" data.
  const travelVisits = homeIso
    ? visits.filter(v => v.iso2 !== homeIso)
    : visits

  // ── First-country milestone is special: it uses the actual
  // country's flag and name. Only fires at exactly the 1-tier; higher
  // tiers fall through to the generic "X countries" badge.
  const visitsSorted = [...travelVisits].sort((a, b) =>
    a.first_visit_date < b.first_visit_date ? -1 : 1)
  const firstVisit = visitsSorted[0]
  const countryTier = highestThreshold(travelVisits.length, COUNTRY_THRESHOLDS)

  if (countryTier === 1 && firstVisit) {
    const pack = getPackByIso2(firstVisit.iso2)
    const country = getCountryByIso2(firstVisit.iso2)
    const name = country?.name ?? pack?.country ?? null
    out.push({
      id: `first-country-${firstVisit.iso2}`,
      emoji: pack?.flag ?? '🌍',
      label: name ? `First new country · ${name}` : 'First new country',
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

  // ── Tried food in N countries — also excludes home. Stamps still
  // carry pack slugs today, so we keep the slug-based check here.
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
    const c = continentFor(v.iso2)
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
