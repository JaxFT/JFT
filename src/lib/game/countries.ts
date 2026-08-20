import type { CountryConfig } from './types'

// Four destinations for v1, in the same play order as the brief's
// destination progression (Japan -> South Korea -> Thailand ->
// Vietnam). Slugs match src/lib/adventurePackMeta.ts so the
// end-of-level CTA can link straight to the matching Adventure Pack.
//
// Pacing note: fireIntervalMs and multiplier magnitudes were tuned
// down from the first pass — the cannon was adding travellers fast
// enough, combined with ×5 multipliers, that obstacle losses became
// imperceptible against the runaway growth. Slower firing + capped
// multipliers + heavier obstacle loss fractions makes both gates and
// obstacles feel like they actually matter.
export const COUNTRIES: CountryConfig[] = [
  {
    slug: 'japan',
    name: 'Japan',
    flag: '🇯🇵',
    iso2: 'jp',
    order: 0,
    theme: { skyTop: '#ffd9e8', skyBottom: '#cfe8ff', ground: '#e8e1d6', road: '#9b8f7d', accent: '#e0568c' },
    landmarkEmoji: '🗻',
    landmarkLabel: 'Mount Fuji',
    fireIntervalMs: 600,
    approachMs: 3400,
    encounters: [
      { type: 'gate', left: { kind: 'multiply', value: 2, label: '×2' }, right: { kind: 'multiply', value: 3, label: '×3' } },
      { type: 'gate', left: { kind: 'add', value: 5, label: '+5' }, right: { kind: 'multiply', value: 2, label: '×2' } },
      { type: 'obstacle', width: 0.4, centerX: 0.5, lossFraction: 0.35, label: 'Rolling barrier' },
      { type: 'gate', left: { kind: 'multiply', value: 2, label: '×2' }, right: { kind: 'add', value: 10, label: '+10' } },
    ],
  },
  {
    slug: 'south-korea',
    name: 'South Korea',
    flag: '🇰🇷',
    iso2: 'kr',
    order: 1,
    theme: { skyTop: '#e6d9ff', skyBottom: '#cfe3ff', ground: '#e3e6ea', road: '#8b93a0', accent: '#c0392b' },
    landmarkEmoji: '🏯',
    landmarkLabel: 'Gyeongbokgung Palace',
    fireIntervalMs: 550,
    approachMs: 3000,
    encounters: [
      { type: 'gate', left: { kind: 'multiply', value: 2, label: '×2' }, right: { kind: 'add', value: 8, label: '+8' } },
      { type: 'obstacle', width: 0.32, centerX: 0.3, moveAmplitude: 0.22, lossFraction: 0.4, label: 'Traffic' },
      { type: 'gate', left: { kind: 'multiply', value: 2.5, label: '×2.5' }, right: { kind: 'multiply', value: 1.5, label: '×1.5' } },
      { type: 'gate', left: { kind: 'add', value: 15, label: '+15' }, right: { kind: 'multiply', value: 2, label: '×2' } },
      { type: 'obstacle', width: 0.45, centerX: 0.5, lossFraction: 0.35, label: 'Construction' },
    ],
  },
  {
    slug: 'thailand',
    name: 'Thailand',
    flag: '🇹🇭',
    iso2: 'th',
    order: 2,
    theme: { skyTop: '#ffe3b0', skyBottom: '#ffb385', ground: '#f2e2c4', road: '#cbb37a', accent: '#f0a500' },
    landmarkEmoji: '🛕',
    landmarkLabel: 'Grand Palace',
    fireIntervalMs: 480,
    approachMs: 2700,
    encounters: [
      { type: 'gate', left: { kind: 'multiply', value: 2, label: '×2' }, right: { kind: 'multiply', value: 2.5, label: '×2.5' } },
      { type: 'obstacle', width: 0.3, centerX: 0.7, moveAmplitude: 0.25, lossFraction: 0.45, label: 'Tuk-tuks' },
      { type: 'gate', left: { kind: 'add', value: 20, label: '+20' }, right: { kind: 'multiply', value: 2, label: '×2' } },
      { type: 'obstacle', width: 0.3, centerX: 0.3, moveAmplitude: 0.25, lossFraction: 0.4, label: 'Puddles' },
      { type: 'gate', left: { kind: 'multiply', value: 3, label: '×3' }, right: { kind: 'multiply', value: 2, label: '×2' } },
      { type: 'gate', left: { kind: 'add', value: 10, label: '+10' }, right: { kind: 'multiply', value: 1.5, label: '×1.5' } },
    ],
  },
  {
    slug: 'vietnam',
    name: 'Vietnam',
    flag: '🇻🇳',
    iso2: 'vn',
    order: 3,
    theme: { skyTop: '#bfe9e6', skyBottom: '#9fd0e8', ground: '#d8e6dd', road: '#7a9b8e', accent: '#0a8f6d' },
    landmarkEmoji: '⛰️',
    landmarkLabel: 'Ha Long Bay',
    fireIntervalMs: 420,
    approachMs: 2400,
    encounters: [
      { type: 'gate', left: { kind: 'multiply', value: 2.5, label: '×2.5' }, right: { kind: 'multiply', value: 2, label: '×2' } },
      { type: 'obstacle', width: 0.28, centerX: 0.4, moveAmplitude: 0.3, lossFraction: 0.45, label: 'Scooters' },
      { type: 'gate', left: { kind: 'multiply', value: 2, label: '×2' }, right: { kind: 'add', value: 25, label: '+25' } },
      { type: 'gate', left: { kind: 'multiply', value: 1.5, label: '×1.5' }, right: { kind: 'multiply', value: 3, label: '×3' } },
      { type: 'obstacle', width: 0.35, centerX: 0.6, moveAmplitude: 0.3, lossFraction: 0.4, label: 'Rice carts' },
      { type: 'gate', left: { kind: 'multiply', value: 2, label: '×2' }, right: { kind: 'multiply', value: 3, label: '×3' } },
      { type: 'gate', left: { kind: 'add', value: 30, label: '+30' }, right: { kind: 'multiply', value: 2, label: '×2' } },
    ],
  },
]

export function getCountry(slug: string): CountryConfig | undefined {
  return COUNTRIES.find(c => c.slug === slug)
}

export function nextCountry(slug: string): CountryConfig | undefined {
  const current = getCountry(slug)
  if (!current) return undefined
  return COUNTRIES.find(c => c.order === current.order + 1)
}
