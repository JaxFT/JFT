// Derived "Traveler" milestones — virtual stamps the kid earns by
// crossing thresholds (visited 5 countries, tried food in 10, etc.).
// They aren't stored in the DB; we compute them at render time from
// the underlying visits + stamps. When the kid crosses a threshold,
// the lower-tier stamp is replaced by the higher tier.

import type { CountryVisitRow, StampRow } from './passport-kid-db'

// Which continent each pack country sits on. Future packs add entries
// here. Turkey is split E/W in real life; we put it on Europe to
// emphasize the bridge that it is in many of its stories.
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

// One stamp earned, drawn passport-stamp style on the Traveler page.
export type MilestoneStamp = {
  // Unique id (used only for React keys)
  id: string
  emoji: string
  label: string
  description: string
  ink: string
  // Date the milestone was first reached (oldest qualifying event).
  earnedAt: string | null
}

const COUNTRY_THRESHOLDS = [1, 5, 10, 15, 20, 30, 50]
const FOOD_THRESHOLDS    = [5, 10, 15, 20]
const CONTINENT_THRESHOLDS = [2, 3, 4, 5, 6, 7]

// Pick the highest threshold the kid has crossed.
function highestThreshold(count: number, thresholds: number[]): number | null {
  let best: number | null = null
  for (const t of thresholds) {
    if (count >= t) best = t
  }
  return best
}

// Date the kid hit the Nth value of a sorted list of timestamps.
function dateOfNth(timestamps: string[], n: number): string | null {
  if (n <= 0 || n > timestamps.length) return null
  const sorted = [...timestamps].sort()
  return sorted[n - 1] ?? null
}

export function computeMilestones(
  visits: CountryVisitRow[],
  stamps: StampRow[],
): MilestoneStamp[] {
  const out: MilestoneStamp[] = []

  // ── Countries visited (progressive — only highest tier shown)
  const visitDates = visits.map(v => v.first_visit_date)
  const countryCount = visits.length
  const countryTier = highestThreshold(countryCount, COUNTRY_THRESHOLDS)
  if (countryTier) {
    out.push({
      id: `countries-${countryTier}`,
      emoji: '🌍',
      label: countryTier === 1 ? 'First country!' : `${countryTier} countries`,
      description: countryTier === 1
        ? 'You unlocked your very first country.'
        : `You’ve visited ${countryTier} different countries.`,
      ink: '#0f3a2a',
      earnedAt: dateOfNth(visitDates, countryTier),
    })
  }

  // ── Tried food in N countries (progressive)
  // A country counts if there's a BRAVE_EATER stamp tied to it.
  const foodByCountry = new Map<string, string>() // slug → earliest earned_at
  for (const s of stamps) {
    if (s.type !== 'BRAVE_EATER' || !s.country_slug) continue
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
      description: `You’ve tried the local food in ${foodTier} countries.`,
      ink: '#9c2516',
      earnedAt: dateOfNth(Array.from(foodByCountry.values()), foodTier),
    })
  }

  // ── Continents visited (one stamp per continent, plus a progressive total)
  const continentDates = new Map<string, string>() // continent → earliest visit date
  for (const v of visits) {
    const c = CONTINENT_BY_SLUG[v.country_slug]
    if (!c) continue
    const prev = continentDates.get(c)
    if (!prev || v.first_visit_date < prev) continentDates.set(c, v.first_visit_date)
  }
  for (const [continent, date] of continentDates) {
    out.push({
      id: `continent-${continent}`,
      emoji: CONTINENT_EMOJI[continent] ?? '🌍',
      label: `${continent} explorer`,
      description: `You’ve been to ${continent}.`,
      ink: CONTINENT_INK[continent] ?? '#5a3a12',
      earnedAt: date,
    })
  }

  // ── Continent count milestone (progressive)
  const continentCount = continentDates.size
  const continentTier = highestThreshold(continentCount, CONTINENT_THRESHOLDS)
  if (continentTier) {
    out.push({
      id: `continents-${continentTier}`,
      emoji: '🌎',
      label: `${continentTier} continents`,
      description: `You’ve been to ${continentTier} different continents.`,
      ink: '#5b21b6',
      earnedAt: dateOfNth(Array.from(continentDates.values()), continentTier),
    })
  }

  return out
}
