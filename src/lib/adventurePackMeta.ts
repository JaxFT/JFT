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
  { slug: 'france',         country: 'France',         flag: '🇫🇷', iso2: 'fr', isFree: true,  heroColour: 'bg-brand-900',   status: 'live', continent: 'Europe', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'morocco',        country: 'Morocco',        flag: '🇲🇦', iso2: 'ma', isFree: false, heroColour: 'bg-amber-900',   status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'indonesia',      country: 'Indonesia',      flag: '🇮🇩', iso2: 'id', isFree: false, heroColour: 'bg-rose-700',    status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'thailand',       country: 'Thailand',       flag: '🇹🇭', iso2: 'th', isFree: false, heroColour: 'bg-fuchsia-700', status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'malaysia',       country: 'Malaysia',       flag: '🇲🇾', iso2: 'my', isFree: false, heroColour: 'bg-amber-700',   status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'spain',          country: 'Spain',          flag: '🇪🇸', iso2: 'es', isFree: false, heroColour: 'bg-red-700',     status: 'live', continent: 'Europe',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'portugal',       country: 'Portugal',       flag: '🇵🇹', iso2: 'pt', isFree: false, heroColour: 'bg-emerald-800', status: 'live', continent: 'Europe',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'united-kingdom', country: 'United Kingdom', flag: '🇬🇧', iso2: 'gb', isFree: false, heroColour: 'bg-blue-900',    status: 'live', continent: 'Europe',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'japan',          country: 'Japan',          flag: '🇯🇵', iso2: 'jp', isFree: false, heroColour: 'bg-rose-800',    status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'vietnam',        country: 'Vietnam',        flag: '🇻🇳', iso2: 'vn', isFree: false, heroColour: 'bg-red-800',     status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'cambodia',       country: 'Cambodia',       flag: '🇰🇭', iso2: 'kh', isFree: false, heroColour: 'bg-indigo-800',  status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'china',          country: 'China',          flag: '🇨🇳', iso2: 'cn', isFree: false, heroColour: 'bg-red-900',     status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'india',          country: 'India',          flag: '🇮🇳', iso2: 'in', isFree: false, heroColour: 'bg-orange-700',  status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'sri-lanka',      country: 'Sri Lanka',      flag: '🇱🇰', iso2: 'lk', isFree: false, heroColour: 'bg-teal-800',    status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'nepal',          country: 'Nepal',          flag: '🇳🇵', iso2: 'np', isFree: false, heroColour: 'bg-stone-700',   status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'turkey',         country: 'Turkey',         flag: '🇹🇷', iso2: 'tr', isFree: false, heroColour: 'bg-red-700',     status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'egypt',          country: 'Egypt',          flag: '🇪🇬', iso2: 'eg', isFree: false, heroColour: 'bg-yellow-700',  status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'australia',      country: 'Australia',      flag: '🇦🇺', iso2: 'au', isFree: false, heroColour: 'bg-orange-800',  status: 'live', continent: 'Oceania',       hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'new-zealand',    country: 'New Zealand',    flag: '🇳🇿', iso2: 'nz', isFree: false, heroColour: 'bg-emerald-700', status: 'live', continent: 'Oceania',       hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'canada',         country: 'Canada',         flag: '🇨🇦', iso2: 'ca', isFree: false, heroColour: 'bg-red-600',     status: 'live', continent: 'North America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'usa',            country: 'United States',  flag: '🇺🇸', iso2: 'us', isFree: false, heroColour: 'bg-blue-800',    status: 'live', continent: 'North America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'mexico',         country: 'Mexico',         flag: '🇲🇽', iso2: 'mx', isFree: false, heroColour: 'bg-lime-800',    status: 'live', continent: 'North America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'costa-rica',     country: 'Costa Rica',     flag: '🇨🇷', iso2: 'cr', isFree: false, heroColour: 'bg-emerald-600', status: 'live', continent: 'North America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'jamaica',        country: 'Jamaica',        flag: '🇯🇲', iso2: 'jm', isFree: false, heroColour: 'bg-yellow-600',  status: 'live', continent: 'North America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'brazil',         country: 'Brazil',         flag: '🇧🇷', iso2: 'br', isFree: false, heroColour: 'bg-green-800',   status: 'live', continent: 'South America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'argentina',      country: 'Argentina',      flag: '🇦🇷', iso2: 'ar', isFree: false, heroColour: 'bg-cyan-700',    status: 'live', continent: 'South America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'chile',          country: 'Chile',          flag: '🇨🇱', iso2: 'cl', isFree: false, heroColour: 'bg-sky-800',     status: 'live', continent: 'South America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'germany',        country: 'Germany',        flag: '🇩🇪', iso2: 'de', isFree: false, heroColour: 'bg-zinc-700',    status: 'live', continent: 'Europe',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'belgium',        country: 'Belgium',        flag: '🇧🇪', iso2: 'be', isFree: false, heroColour: 'bg-amber-800',   status: 'live', continent: 'Europe',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'netherlands',    country: 'Netherlands',    flag: '🇳🇱', iso2: 'nl', isFree: false, heroColour: 'bg-orange-600',  status: 'live', continent: 'Europe',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'uae',            country: 'United Arab Emirates', flag: '🇦🇪', iso2: 'ae', isFree: false, heroColour: 'bg-yellow-800', status: 'live', continent: 'Asia',      hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'south-africa',   country: 'South Africa',   flag: '🇿🇦', iso2: 'za', isFree: false, heroColour: 'bg-orange-900',  status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'pakistan',       country: 'Pakistan',       flag: '🇵🇰', iso2: 'pk', isFree: false, heroColour: 'bg-green-900',   status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'bangladesh',     country: 'Bangladesh',     flag: '🇧🇩', iso2: 'bd', isFree: false, heroColour: 'bg-teal-900',    status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'laos',           country: 'Laos',           flag: '🇱🇦', iso2: 'la', isFree: false, heroColour: 'bg-rose-900',    status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'italy', country: 'Italy', flag: '🇮🇹', iso2: 'it', isFree: false, heroColour: 'bg-red-950', status: 'live', continent: 'Europe', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'hungary', country: 'Hungary', flag: '🇭🇺', iso2: 'hu', isFree: false, heroColour: 'bg-rose-950', status: 'live', continent: 'Europe', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'switzerland', country: 'Switzerland', flag: '🇨🇭', iso2: 'ch', isFree: false, heroColour: 'bg-stone-800', status: 'live', continent: 'Europe', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'greece', country: 'Greece', flag: '🇬🇷', iso2: 'gr', isFree: false, heroColour: 'bg-sky-700', status: 'live', continent: 'Europe', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'sweden', country: 'Sweden', flag: '🇸🇪', iso2: 'se', isFree: false, heroColour: 'bg-blue-700', status: 'live', continent: 'Europe', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'norway', country: 'Norway', flag: '🇳🇴', iso2: 'no', isFree: false, heroColour: 'bg-blue-950', status: 'live', continent: 'Europe', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'denmark', country: 'Denmark', flag: '🇩🇰', iso2: 'dk', isFree: false, heroColour: 'bg-red-700', status: 'live', continent: 'Europe', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'poland', country: 'Poland', flag: '🇵🇱', iso2: 'pl', isFree: false, heroColour: 'bg-pink-800', status: 'live', continent: 'Europe', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'latvia', country: 'Latvia', flag: '🇱🇻', iso2: 'lv', isFree: false, heroColour: 'bg-amber-950', status: 'live', continent: 'Europe', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'lithuania', country: 'Lithuania', flag: '🇱🇹', iso2: 'lt', isFree: false, heroColour: 'bg-yellow-900', status: 'live', continent: 'Europe', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'romania', country: 'Romania', flag: '🇷🇴', iso2: 'ro', isFree: false, heroColour: 'bg-indigo-900', status: 'live', continent: 'Europe', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'peru',      country: 'Peru',      flag: '🇵🇪', iso2: 'pe', isFree: false, heroColour: 'bg-orange-950', status: 'live', continent: 'South America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'colombia',  country: 'Colombia',  flag: '🇨🇴', iso2: 'co', isFree: false, heroColour: 'bg-amber-600',  status: 'live', continent: 'South America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'ecuador',   country: 'Ecuador',   flag: '🇪🇨', iso2: 'ec', isFree: false, heroColour: 'bg-lime-700',   status: 'live', continent: 'South America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'uruguay',   country: 'Uruguay',   flag: '🇺🇾', iso2: 'uy', isFree: false, heroColour: 'bg-sky-600',    status: 'live', continent: 'South America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'iceland',   country: 'Iceland',   flag: '🇮🇸', iso2: 'is', isFree: false, heroColour: 'bg-slate-700',  status: 'live', continent: 'Europe',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'kenya',     country: 'Kenya',     flag: '🇰🇪', iso2: 'ke', isFree: false, heroColour: 'bg-amber-500',  status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'nigeria',   country: 'Nigeria',   flag: '🇳🇬', iso2: 'ng', isFree: false, heroColour: 'bg-green-700',  status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'ghana',     country: 'Ghana',     flag: '🇬🇭', iso2: 'gh', isFree: false, heroColour: 'bg-yellow-500', status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'malawi',    country: 'Malawi',    flag: '🇲🇼', iso2: 'mw', isFree: false, heroColour: 'bg-emerald-900',status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'algeria',   country: 'Algeria',   flag: '🇩🇿', iso2: 'dz', isFree: false, heroColour: 'bg-stone-600',  status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'tunisia',   country: 'Tunisia',   flag: '🇹🇳', iso2: 'tn', isFree: false, heroColour: 'bg-red-500',    status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'zimbabwe',  country: 'Zimbabwe',  flag: '🇿🇼', iso2: 'zw', isFree: false, heroColour: 'bg-stone-900',  status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'tanzania',   country: 'Tanzania',   flag: '🇹🇿', iso2: 'tz', isFree: false, heroColour: 'bg-lime-600',   status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'jordan',     country: 'Jordan',     flag: '🇯🇴', iso2: 'jo', isFree: false, heroColour: 'bg-stone-500',  status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'south-korea',country: 'South Korea',flag: '🇰🇷', iso2: 'kr', isFree: false, heroColour: 'bg-rose-600',   status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'singapore',  country: 'Singapore',  flag: '🇸🇬', iso2: 'sg', isFree: false, heroColour: 'bg-red-400',    status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'czechia',    country: 'Czechia',    flag: '🇨🇿', iso2: 'cz', isFree: false, heroColour: 'bg-blue-600',   status: 'live', continent: 'Europe',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'cuba',       country: 'Cuba',       flag: '🇨🇺', iso2: 'cu', isFree: false, heroColour: 'bg-cyan-600',   status: 'live', continent: 'North America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'bolivia',    country: 'Bolivia',    flag: '🇧🇴', iso2: 'bo', isFree: false, heroColour: 'bg-amber-400',  status: 'live', continent: 'South America', hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'namibia',    country: 'Namibia',    flag: '🇳🇦', iso2: 'na', isFree: false, heroColour: 'bg-yellow-400', status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'botswana',   country: 'Botswana',   flag: '🇧🇼', iso2: 'bw', isFree: false, heroColour: 'bg-sky-500',    status: 'live', continent: 'Africa',        hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'fiji',       country: 'Fiji',       flag: '🇫🇯', iso2: 'fj', isFree: false, heroColour: 'bg-cyan-500',   status: 'live', continent: 'Oceania',       hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'philippines',country: 'Philippines',flag: '🇵🇭', iso2: 'ph', isFree: false, heroColour: 'bg-yellow-300', status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'taiwan',     country: 'Taiwan',     flag: '🇹🇼', iso2: 'tw', isFree: false, heroColour: 'bg-rose-500',   status: 'live', continent: 'Asia',          hasWordSearch: true, hasTilePuzzle: true },
  { slug: 'slovenia',   country: 'Slovenia',   flag: '🇸🇮', iso2: 'si', isFree: false, heroColour: 'bg-emerald-500',status: 'live', continent: 'Europe',        hasWordSearch: true, hasTilePuzzle: true },
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
  const hasTilePuzzle = !!meta?.hasTilePuzzle
  return SECTION_KEYS.filter(k => {
    if (k === 'wordsearch') return hasWordSearch
    if (k === 'tilepuzzle') return hasTilePuzzle
    return true
  })
}

export function getPackSectionCount(slug: string): number {
  return getPackSectionKeys(slug).length
}

// Look up a pack by its ISO 3166-1 alpha-2 country code. Used to
// bridge the kid's home_country_iso2 (any country) to the optional
// pack we have for that country (if any). Returns null if the country
// isn't one of the available packs, entirely normal for families
// living somewhere we haven't built a pack for yet.
export function getPackByIso2(iso2: string | null | undefined): AdventurePackMeta | null {
  if (!iso2) return null
  const lower = iso2.toLowerCase()
  return PACK_META.find(p => p.iso2 === lower) ?? null
}
