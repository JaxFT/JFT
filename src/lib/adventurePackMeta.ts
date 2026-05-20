// Lightweight metadata for every country pack. This file deliberately
// does NOT import the full pack data — it's ~50 lines vs ~4000 — so
// any route that only needs the country/flag/continent (the blog
// filter, the parent picker, the kid tabs, every API route that just
// needs a country label) can import from here without dragging the
// full content blocks into its Worker bundle.
//
// The Cloudflare Worker memory limit was being tripped by routes that
// only needed PACK_META still pulling in the entire adventurePackData.ts
// module. Splitting fixes that.
//
// Routes that DO need full content (the actual pack pages) still import
// `getPackData` from adventurePackData.ts.

import type { AdventurePackMeta, SectionKey } from './adventurePackTypes'
import { SECTION_KEYS } from './adventurePackTypes'

export const PACK_META: AdventurePackMeta[] = [
  { slug: 'france',         country: 'France',         flag: '🇫🇷', iso2: 'fr', isFree: true,  heroColour: 'bg-brand-900',   status: 'live', continent: 'Europe', hasWordSearch: true },
  { slug: 'morocco',        country: 'Morocco',        flag: '🇲🇦', iso2: 'ma', isFree: false, heroColour: 'bg-amber-900',   status: 'live', continent: 'Africa' },
  { slug: 'indonesia',      country: 'Indonesia',      flag: '🇮🇩', iso2: 'id', isFree: false, heroColour: 'bg-rose-700',    status: 'live', continent: 'Asia' },
  { slug: 'thailand',       country: 'Thailand',       flag: '🇹🇭', iso2: 'th', isFree: false, heroColour: 'bg-fuchsia-700', status: 'live', continent: 'Asia' },
  { slug: 'malaysia',       country: 'Malaysia',       flag: '🇲🇾', iso2: 'my', isFree: false, heroColour: 'bg-amber-700',   status: 'live', continent: 'Asia' },
  { slug: 'spain',          country: 'Spain',          flag: '🇪🇸', iso2: 'es', isFree: false, heroColour: 'bg-red-700',     status: 'live', continent: 'Europe' },
  { slug: 'portugal',       country: 'Portugal',       flag: '🇵🇹', iso2: 'pt', isFree: false, heroColour: 'bg-emerald-800', status: 'live', continent: 'Europe' },
  { slug: 'united-kingdom', country: 'United Kingdom', flag: '🇬🇧', iso2: 'gb', isFree: false, heroColour: 'bg-blue-900',    status: 'live', continent: 'Europe' },
  { slug: 'japan',          country: 'Japan',          flag: '🇯🇵', iso2: 'jp', isFree: false, heroColour: 'bg-rose-800',    status: 'live', continent: 'Asia' },
  { slug: 'vietnam',        country: 'Vietnam',        flag: '🇻🇳', iso2: 'vn', isFree: false, heroColour: 'bg-red-800',     status: 'live', continent: 'Asia' },
  { slug: 'cambodia',       country: 'Cambodia',       flag: '🇰🇭', iso2: 'kh', isFree: false, heroColour: 'bg-indigo-800',  status: 'live', continent: 'Asia' },
  { slug: 'china',          country: 'China',          flag: '🇨🇳', iso2: 'cn', isFree: false, heroColour: 'bg-red-900',     status: 'live', continent: 'Asia' },
  { slug: 'india',          country: 'India',          flag: '🇮🇳', iso2: 'in', isFree: false, heroColour: 'bg-orange-700',  status: 'live', continent: 'Asia' },
  { slug: 'sri-lanka',      country: 'Sri Lanka',      flag: '🇱🇰', iso2: 'lk', isFree: false, heroColour: 'bg-teal-800',    status: 'live', continent: 'Asia' },
  { slug: 'nepal',          country: 'Nepal',          flag: '🇳🇵', iso2: 'np', isFree: false, heroColour: 'bg-stone-700',   status: 'live', continent: 'Asia' },
  { slug: 'turkey',         country: 'Turkey',         flag: '🇹🇷', iso2: 'tr', isFree: false, heroColour: 'bg-red-700',     status: 'live', continent: 'Asia' },
  { slug: 'egypt',          country: 'Egypt',          flag: '🇪🇬', iso2: 'eg', isFree: false, heroColour: 'bg-yellow-700',  status: 'live', continent: 'Africa' },
  { slug: 'australia',      country: 'Australia',      flag: '🇦🇺', iso2: 'au', isFree: false, heroColour: 'bg-orange-800',  status: 'live', continent: 'Oceania' },
  { slug: 'new-zealand',    country: 'New Zealand',    flag: '🇳🇿', iso2: 'nz', isFree: false, heroColour: 'bg-emerald-700', status: 'live', continent: 'Oceania' },
  { slug: 'canada',         country: 'Canada',         flag: '🇨🇦', iso2: 'ca', isFree: false, heroColour: 'bg-red-600',     status: 'live', continent: 'North America' },
  { slug: 'usa',            country: 'United States',  flag: '🇺🇸', iso2: 'us', isFree: false, heroColour: 'bg-blue-800',    status: 'live', continent: 'North America' },
  { slug: 'mexico',         country: 'Mexico',         flag: '🇲🇽', iso2: 'mx', isFree: false, heroColour: 'bg-lime-800',    status: 'live', continent: 'North America' },
  { slug: 'costa-rica',     country: 'Costa Rica',     flag: '🇨🇷', iso2: 'cr', isFree: false, heroColour: 'bg-emerald-600', status: 'live', continent: 'North America' },
  { slug: 'jamaica',        country: 'Jamaica',        flag: '🇯🇲', iso2: 'jm', isFree: false, heroColour: 'bg-yellow-600',  status: 'live', continent: 'North America' },
  { slug: 'brazil',         country: 'Brazil',         flag: '🇧🇷', iso2: 'br', isFree: false, heroColour: 'bg-green-800',   status: 'live', continent: 'South America' },
  { slug: 'argentina',      country: 'Argentina',      flag: '🇦🇷', iso2: 'ar', isFree: false, heroColour: 'bg-cyan-700',    status: 'live', continent: 'South America' },
  { slug: 'chile',          country: 'Chile',          flag: '🇨🇱', iso2: 'cl', isFree: false, heroColour: 'bg-sky-800',     status: 'live', continent: 'South America' },
  { slug: 'germany',        country: 'Germany',        flag: '🇩🇪', iso2: 'de', isFree: false, heroColour: 'bg-zinc-700',    status: 'live', continent: 'Europe' },
  { slug: 'belgium',        country: 'Belgium',        flag: '🇧🇪', iso2: 'be', isFree: false, heroColour: 'bg-amber-800',   status: 'live', continent: 'Europe' },
  { slug: 'netherlands',    country: 'Netherlands',    flag: '🇳🇱', iso2: 'nl', isFree: false, heroColour: 'bg-orange-600',  status: 'live', continent: 'Europe' },
  { slug: 'uae',            country: 'United Arab Emirates', flag: '🇦🇪', iso2: 'ae', isFree: false, heroColour: 'bg-yellow-800', status: 'live', continent: 'Asia' },
  { slug: 'south-africa',   country: 'South Africa',   flag: '🇿🇦', iso2: 'za', isFree: false, heroColour: 'bg-orange-900',  status: 'live', continent: 'Africa' },
  { slug: 'pakistan',       country: 'Pakistan',       flag: '🇵🇰', iso2: 'pk', isFree: false, heroColour: 'bg-green-900',   status: 'live', continent: 'Asia' },
  { slug: 'bangladesh',     country: 'Bangladesh',     flag: '🇧🇩', iso2: 'bd', isFree: false, heroColour: 'bg-teal-900',    status: 'live', continent: 'Asia' },
  { slug: 'laos',           country: 'Laos',           flag: '🇱🇦', iso2: 'la', isFree: false, heroColour: 'bg-rose-900',    status: 'live', continent: 'Asia' },
]

export function getPackMeta(slug: string): AdventurePackMeta | null {
  return PACK_META.find(p => p.slug === slug) ?? null
}

// Sections that count toward this country's completion. Mirrors
// `getPackSections(data)` for callers that only have the slug/meta
// (the kid tabs, the kid country page, the session-save API route).
export function getPackSectionKeys(slug: string): SectionKey[] {
  const meta = getPackMeta(slug)
  const hasWordSearch = !!meta?.hasWordSearch
  return SECTION_KEYS.filter(k => k !== 'wordsearch' || hasWordSearch)
}

export function getPackSectionCount(slug: string): number {
  return getPackSectionKeys(slug).length
}

// Look up a pack by its ISO 3166-1 alpha-2 country code. Used to
// bridge the kid's home_country_iso2 (any country) to the optional
// pack we have for that country (if any). Returns null if the country
// isn't one of the 35 packs — entirely normal for families living in
// e.g. Switzerland or Norway.
export function getPackByIso2(iso2: string | null | undefined): AdventurePackMeta | null {
  if (!iso2) return null
  const lower = iso2.toLowerCase()
  return PACK_META.find(p => p.iso2 === lower) ?? null
}
