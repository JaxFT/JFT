// Data model + content for the JFT Prompt Builder.
//
// Each prompt knows its tailored questions and a `build()` that turns
// the answers + the saved family profile into an ENGINEERED prompt
// (ROLE / CONTEXT / TASK / FORMAT) for the user to paste into their own
// AI. The output is deliberately structured and token-efficient, not
// chatty — that engineering is the value the builder adds. Every output
// ends with the branded watermark.
//
// Principles (see spec): Tier B (no on-site AI), no [brackets] shown to
// the user (every blank is a guided question), capability badges, and
// the watermark. To tweak wording, edit the strings here.

export type Badge = 'web' | 'any'
export type QuestionType = 'text' | 'textarea' | 'select' | 'number' | 'multiselect'

export type Question = {
  id: string
  label: string
  type: QuestionType
  placeholder?: string
  options?: string[]
  optional?: boolean
  // Free-text suggestions shown via a datalist (user can still type
  // anything). Used to make vague fields like "region" less daunting.
  suggestions?: string[]
  // When set and the user hasn't typed an answer yet, the field
  // pre-fills from this saved profile value (e.g. home airport into
  // "Flying from?"). The user can still overwrite it.
  prefillFrom?: 'homeAirport' | 'homeCountry'
}

export type FamilyProfile = {
  adults: number | null
  kidsAges: number[]
  homeCountry: string | null
  homeAirport: string | null
  homeCurrency: string | null
  travelStyle: string[]
}

export const EMPTY_PROFILE: FamilyProfile = {
  adults: null,
  kidsAges: [],
  homeCountry: null,
  homeAirport: null,
  homeCurrency: null,
  travelStyle: [],
}

// Options for the multi-select travel-style chips.
export const TRAVEL_STYLES = [
  'Budget', 'Mid-range', 'Comfort', 'Slow travel', 'Adventure', 'Luxury',
] as const

// Home currency picker. Label is what we drop into prompts verbatim.
export const CURRENCIES = [
  'GBP (£)', 'USD ($)', 'EUR (€)', 'AUD (A$)', 'CAD (C$)', 'NZD (NZ$)',
  'CHF', 'JPY (¥)', 'SGD (S$)', 'AED (د.إ)', 'ZAR (R)', 'INR (₹)',
] as const

// A short list of major hubs for the home-airport datalist. Free text
// is still allowed for anywhere not listed.
export const MAJOR_AIRPORTS = [
  'London Heathrow (LHR)', 'London Gatwick (LGW)', 'London Stansted (STN)',
  'Manchester (MAN)', 'Birmingham (BHX)', 'Edinburgh (EDI)', 'Glasgow (GLA)',
  'Bristol (BRS)', 'Dublin (DUB)', 'Belfast (BFS)', 'Newcastle (NCL)',
  'Liverpool (LPL)', 'Leeds Bradford (LBA)', 'East Midlands (EMA)',
  'Paris CDG (CDG)', 'Amsterdam (AMS)', 'Frankfurt (FRA)', 'Madrid (MAD)',
  'New York JFK (JFK)', 'Los Angeles (LAX)', 'Toronto (YYZ)',
  'Sydney (SYD)', 'Dubai (DXB)', 'Singapore (SIN)',
] as const

// Region suggestions for the shoulder-season builder's "region" field.
const REGION_SUGGESTIONS = [
  'Southeast Asia', 'South Asia', 'East Asia', 'Central Asia',
  'Europe', 'Eastern Europe', 'The Balkans', 'Central America',
  'South America', 'The Caribbean', 'North Africa', 'Sub-Saharan Africa',
  'Middle East', 'Oceania / Pacific',
]

// Currency directive appended to money-related prompts so the AI
// answers in the family's home currency, not USD by default.
function moneyRule(p: FamilyProfile): string {
  return `\nCURRENCY: Report all costs in ${p.homeCurrency || 'GBP (£)'}.`
}

export type PromptDef = {
  id: string
  category: CategoryId
  title: string
  badge: Badge
  useCase: string
  questions: Question[]
  build: (a: Record<string, string>, p: FamilyProfile) => string
  // Optional soft cross-link to our own products, shown in the panel
  // (human-facing only — never injected into the AI prompt).
  crossLink?: { text: string; links: { label: string; href: string }[] }
}

// Reused on the kid-experience prompts: nudges parents toward our own
// Adventure Packs / Passport without polluting the generated prompt.
const ADVENTURE_CROSSLINK = {
  text: 'Turn it into an adventure for the kids with our',
  links: [
    { label: 'Adventure Packs', href: '/adventure-packs' },
    { label: 'Adventure Passport', href: '/passports' },
  ],
}

export type CategoryId =
  | 'family' | 'flights' | 'route' | 'budget' | 'itinerary'

export type Category = { id: CategoryId; label: string; emoji: string }

export const CATEGORIES: Category[] = [
  { id: 'route',     label: 'Route & timing',       emoji: '🗺️' },
  { id: 'flights',   label: 'Flights',              emoji: '✈️' },
  { id: 'budget',    label: 'Budget & money',       emoji: '💰' },
  { id: 'itinerary', label: 'Planning & itinerary', emoji: '🗓️' },
  { id: 'family',    label: 'Family & kids',        emoji: '👨‍👩‍👧‍👦' },
]

export const BADGE_LABEL: Record<Badge, string> = {
  web: 'Needs a live-web AI',
  any: 'Works in any AI',
}

export const BADGE_NOTE: Record<Badge, string> = {
  web: 'Best used in an AI with live web access — ChatGPT (search on), Perplexity, Gemini, or Claude with web. Double-check any prices yourself.',
  any: 'Works in any AI — ChatGPT, Claude, Gemini, Copilot, etc.',
}

const WATERMARK =
  '\n\n—\nPrompt by Jax Family Travels · family travel experts · jaxfamilytravels.com'

// Trim the engineered body and append the human-facing watermark.
function wrap(body: string): string {
  return body.trim() + WATERMARK
}

// "2 adults + kids aged 4 & 7" — falls back gracefully when the profile
// is incomplete so prompts still read sensibly.
export function travellersStr(p: FamilyProfile): string {
  const parts: string[] = []
  if (p.adults && p.adults > 0) parts.push(`${p.adults} adult${p.adults > 1 ? 's' : ''}`)
  if (p.kidsAges.length) parts.push(`kids aged ${agesStr(p.kidsAges)}`)
  return parts.join(' + ') || 'a family'
}

export function agesStr(ages: number[]): string {
  if (!ages.length) return 'our kids'
  if (ages.length === 1) return `${ages[0]}`
  return ages.slice(0, -1).join(', ') + ' & ' + ages[ages.length - 1]
}

// ── PROMPTS ────────────────────────────────────────────────────────
export const PROMPTS: PromptDef[] = [
  // PLANNING & ITINERARY — cross-cutting "starter" prompts (these used
  // to be a "Start here" category; they now live under Planning).
  {
    id: 'interview-first',
    category: 'itinerary',
    title: 'Make the AI interview you first',
    badge: 'any',
    useCase: 'Best when you don\'t even know what to ask — the AI draws it out of you.',
    questions: [
      { id: 'destination', label: 'Where are you going?', type: 'text', placeholder: 'e.g. Vietnam' },
      { id: 'dates', label: 'When, and for how long?', type: 'text', placeholder: 'e.g. March 2027, 3 weeks' },
      { id: 'booked', label: 'Anything already booked?', type: 'text', optional: true, placeholder: 'e.g. flights in, first 2 nights' },
    ],
    build: (a, p) => wrap(
`ROLE: Seasoned family-travel expert.
CONTEXT: ${a.destination} | ${a.dates} | ${travellersStr(p)}.${a.booked ? `\nALREADY BOOKED: ${a.booked}` : ''}
TASK: Interview me ONE question at a time about budget, priorities, energy and must-haves. Once you have enough, build a tailored plan.
RULES: One question per message; wait for my reply; no advice until done.`),
  },
  {
    id: 'blind-spots',
    category: 'itinerary',
    title: 'Find my blind spots',
    badge: 'any',
    useCase: 'Surfaces the questions a seasoned family-travel expert would ask that you haven\'t.',
    questions: [
      { id: 'destination', label: 'Where are you going?', type: 'text', placeholder: 'e.g. Japan' },
      { id: 'dates', label: 'When, and for how long?', type: 'text', placeholder: 'e.g. April 2027, 2 weeks' },
    ],
    build: (a, p) => wrap(
`ROLE: Seasoned family-travel expert.
CONTEXT: ${a.destination} | ${a.dates} | ${travellersStr(p)}.
TASK: List the 10 most important questions I likely haven't considered, specific to this destination, season, and my kids' ages.
FORMAT: Numbered list, one line each. No preamble.`),
  },
  {
    id: 'roast-itinerary',
    category: 'itinerary',
    title: 'Roast my itinerary, then fix it',
    badge: 'any',
    useCase: 'A brutally honest expert tears your plan apart, then rebuilds it calmer.',
    questions: [
      { id: 'destination', label: 'Where is this trip?', type: 'text', placeholder: 'e.g. Italy' },
      { id: 'itinerary', label: 'Paste your itinerary', type: 'textarea', placeholder: 'Day 1: ...\nDay 2: ...' },
    ],
    build: (a, p) => wrap(
`ROLE: Brutally honest but constructive family-travel expert.
CONTEXT: ${a.destination} | ${travellersStr(p)}.
INPUT:
${a.itinerary}
TASK: 1) Roast it — what's unrealistic, over-packed, or stressful for these ages. 2) Rebuild it calmer and realistic.
FORMAT: "The roast" (bullets), then "The fix" (day-by-day).`),
  },

  // 2. 👨‍👩‍👧‍👦 FAMILY & KIDS
  {
    id: 'for-the-kids',
    category: 'family',
    title: 'What\'s genuinely for the kids?',
    badge: 'any',
    useCase: 'Separates real kid joy from photo ops and things that are really for the adults.',
    questions: [
      { id: 'destination', label: 'Where are you going?', type: 'text', placeholder: 'e.g. Paris' },
      { id: 'attractions', label: 'Paste places you\'re considering', type: 'textarea', optional: true, placeholder: 'Leave blank for the top sights' },
    ],
    build: (a, p) => wrap(
`ROLE: Honest family-travel expert.
CONTEXT: ${a.destination} | kids aged ${agesStr(p.kidsAges)}.
TASK: Sort ${a.attractions ? `these places:\n${a.attractions}` : 'the top things to do there'} into:
  1) GENUINE KID JOY  2) JUST A PHOTO OP  3) REALLY FOR ADULTS
Judge from the view of kids these exact ages.
FORMAT: Three labelled groups, one-line reason each.`),
    crossLink: ADVENTURE_CROSSLINK,
  },
  {
    id: 'will-remember',
    category: 'family',
    title: 'Will they remember it in 10 years?',
    badge: 'any',
    useCase: 'Predicts which moments actually stick — and 3 cheap ones that punch above their weight.',
    questions: [
      { id: 'destination', label: 'Where are you going?', type: 'text', placeholder: 'e.g. Thailand' },
      { id: 'highlights', label: 'Paste your planned highlights', type: 'textarea', optional: true, placeholder: 'Leave blank for typical highlights there' },
    ],
    build: (a, p) => wrap(
`ROLE: Honest family-travel expert.
CONTEXT: ${a.destination} | kids aged ${agesStr(p.kidsAges)}.
TASK: Predict which experiences ${a.highlights ? `from my list:\n${a.highlights}` : 'typical there'} kids these ages will actually remember in 10 years vs forget. Add 3 cheap, high-memory moments.
FORMAT: "Will remember" / "Won't" / "Add these".`),
    crossLink: ADVENTURE_CROSSLINK,
  },
  {
    id: 'excite-kids',
    category: 'family',
    title: 'Get the kids excited (pre-trip explainer)',
    badge: 'any',
    useCase: 'A fun, age-appropriate hype-up about the destination before you go.',
    questions: [
      { id: 'destination', label: 'Where are you going?', type: 'text', placeholder: 'e.g. Japan' },
    ],
    build: (a, p) => wrap(
`ROLE: Fun storyteller for children.
CONTEXT: Audience = kids aged ${agesStr(p.kidsAges)}. Destination = ${a.destination}.
TASK: Short, exciting, age-appropriate explainer of what's cool, weird and fun there, to build anticipation.
FORMAT: Playful, 150–200 words + 3 "things to look out for".`),
    crossLink: ADVENTURE_CROSSLINK,
  },
  {
    id: 'jet-lag',
    category: 'family',
    title: 'Family jet-lag shift plan',
    badge: 'any',
    useCase: 'A day-by-day sleep and light plan to get the kids adjusted fast.',
    questions: [
      { id: 'origin', label: 'Flying from?', type: 'text', placeholder: 'e.g. London', prefillFrom: 'homeAirport' },
      { id: 'destination', label: 'Flying to?', type: 'text', placeholder: 'e.g. Bali' },
      { id: 'arrival', label: 'Arrival date & local time?', type: 'text', placeholder: 'e.g. 12 Feb, 6am' },
    ],
    build: (a, p) => wrap(
`ROLE: Family sleep & jet-lag expert.
CONTEXT: ${a.origin} -> ${a.destination} | arrive ${a.arrival} | kids aged ${agesStr(p.kidsAges)}.
TASK: Day-by-day sleep + light-exposure plan to adjust the kids, from 3 days BEFORE flying to 3 days after arrival. Work out the time difference yourself.
FORMAT: Table by day — bedtime, wake, naps, light/dark actions.`),
  },
  {
    id: 'nap-proof',
    category: 'family',
    title: 'Nap-proof my itinerary',
    badge: 'any',
    useCase: 'Reworks a day plan around a toddler\'s nap without losing the good stuff.',
    questions: [
      { id: 'destination', label: 'Where is this?', type: 'text', placeholder: 'e.g. Rome' },
      { id: 'nap', label: 'Nap window?', type: 'text', placeholder: 'e.g. 1–3pm' },
      { id: 'plan', label: 'Paste your day plan', type: 'textarea', placeholder: 'Morning: ...\nAfternoon: ...' },
    ],
    build: (a, p) => wrap(
`ROLE: Family-travel expert who plans around naps.
CONTEXT: ${a.destination} | kids aged ${agesStr(p.kidsAges)} | nap window ${a.nap}.
INPUT:
${a.plan}
TASK: Rework the day to protect the nap — cut, move, or do-on-the-go (stroller/transit naps). Stay realistic.
FORMAT: Revised timeline + one-line "why" per change.`),
  },

  // 3. ✈️ FLIGHTS & GETTING THERE
  {
    id: 'cheapest-flight',
    category: 'flights',
    title: 'Cheapest realistic flight finder',
    badge: 'web',
    useCase: 'Lowest TOTAL cost — nearby airports, split tickets, bags and fees included.',
    questions: [
      { id: 'origin', label: 'Flying from?', type: 'text', placeholder: 'e.g. Manchester', prefillFrom: 'homeAirport' },
      { id: 'destination', label: 'Flying to?', type: 'text', placeholder: 'e.g. Bali' },
      { id: 'dateRange', label: 'Date range?', type: 'text', placeholder: 'e.g. early Feb 2027' },
      { id: 'bags', label: 'Checked bags?', type: 'number', placeholder: 'e.g. 2' },
      { id: 'nearby', label: 'Consider nearby airports?', type: 'select', options: ['Yes', 'No'] },
    ],
    build: (a, p) => wrap(
`ROLE: Expert flight-deal researcher with live web access.
CONTEXT: ${a.origin} -> ${a.destination} | ${a.dateRange} | ${travellersStr(p)} | ${a.bags} checked bags | nearby airports: ${a.nearby}.${moneyRule(p)}
TASK: Find the cheapest REALISTIC routing incl. nearby airports and split-ticket options. Price the TOTAL (fares + bags + fees).
RULES: Use current data; cite sources; flag risky self-transfers.
FORMAT: Ranked options — total cost, route, why.`),
  },
  {
    id: 'flexible-dates',
    category: 'flights',
    title: 'Flexible-date price analyser',
    badge: 'web',
    useCase: 'Finds the cheapest dates in your window and explains why they\'re cheaper.',
    questions: [
      { id: 'origin', label: 'Flying from?', type: 'text', placeholder: 'e.g. London', prefillFrom: 'homeAirport' },
      { id: 'destination', label: 'Flying to?', type: 'text', placeholder: 'e.g. Tokyo' },
      { id: 'target', label: 'Target date?', type: 'text', placeholder: 'e.g. 15 April 2027' },
      { id: 'window', label: 'Flexible by how many days?', type: 'number', placeholder: 'e.g. 5' },
    ],
    build: (a, p) => wrap(
`ROLE: Flight pricing analyst with live web access.
CONTEXT: ${a.origin} -> ${a.destination} | target ${a.target} ± ${a.window} days | ${travellersStr(p)}.${moneyRule(p)}
TASK: Find the cheapest date combinations in that window and explain WHY those dates are cheaper.
FORMAT: Cheapest 3 date sets — total cost + reason.`),
  },
  {
    id: 'family-flight',
    category: 'flights',
    title: 'Family-friendly flight filter',
    badge: 'web',
    useCase: 'Prioritises short travel time and kid-friendly timings over headline fares.',
    questions: [
      { id: 'origin', label: 'Flying from?', type: 'text', placeholder: 'e.g. Manchester', prefillFrom: 'homeAirport' },
      { id: 'destination', label: 'Flying to?', type: 'text', placeholder: 'e.g. Orlando' },
      { id: 'dates', label: 'Dates?', type: 'text', placeholder: 'e.g. school summer holidays 2027' },
    ],
    build: (a, p) => wrap(
`ROLE: Family flight expert with live web access.
CONTEXT: ${a.origin} -> ${a.destination} | ${a.dates} | ${travellersStr(p)}.${moneyRule(p)}
TASK: Recommend flights prioritising short total travel time, minimal overnight layovers, and child-friendly departure times — not just lowest fare.
FORMAT: Top 3 — times, layovers, why it suits these ages.`),
  },
  {
    id: 'long-haul',
    category: 'flights',
    title: 'Long-haul battle plan',
    badge: 'any',
    useCase: 'An hour-by-hour survival plan for a long flight with kids.',
    questions: [
      { id: 'hours', label: 'Flight length (hours)?', type: 'number', placeholder: 'e.g. 12' },
      { id: 'timing', label: 'Day or overnight?', type: 'select', options: ['Day flight', 'Overnight flight'] },
    ],
    build: (a, p) => wrap(
`ROLE: Veteran parent + long-haul flight expert.
CONTEXT: ${a.hours}-hour ${a.timing} | kids aged ${agesStr(p.kidsAges)}.
TASK: Hour-by-hour survival plan — sleep timing, snack/meal spacing, screen-free activities, ear-pain at take-off/landing, plus a day-bag checklist.
FORMAT: Timeline + "day bag" checklist.`),
  },

  // 4. 🗺️ ROUTE & TIMING
  {
    id: 'shoulder-season',
    category: 'route',
    title: 'Shoulder-season route builder',
    badge: 'web',
    useCase: 'Sequences a long trip so you hit shoulder season (good weather, fewer crowds) in each country.',
    questions: [
      { id: 'region', label: 'Region, or specific countries?', type: 'text', placeholder: 'Start typing or pick a region', suggestions: REGION_SUGGESTIONS },
      { id: 'start', label: 'When do you leave?', type: 'text', placeholder: 'e.g. September 2027' },
      { id: 'duration', label: 'How long in total?', type: 'text', placeholder: 'e.g. 6 months' },
      { id: 'priority', label: 'What matters most? (pick any)', type: 'multiselect', options: ['Best weather', 'Low cost', 'Fewer crowds', 'Cultural immersion', 'Beaches & coast', 'Worldschooling hubs', 'Great for kids', 'Nature & wildlife', 'Food'] },
      { id: 'pace', label: 'Pace?', type: 'select', options: ['Fewer countries, deeper', 'More countries, faster'] },
    ],
    build: (a, p) => wrap(
`ROLE: Expert long-term family route planner.
CONTEXT: ${a.region} | start ${a.start} | ${a.duration} | ${travellersStr(p)}.${moneyRule(p)}
GOAL: Recommend countries + weeks in each, sequenced to hit shoulder season (good weather, lower crowds/prices) as we move. Priorities: ${a.priority}.
CONSTRAINTS: Minimise backtracking; logical overland/short-haul flow; family pace (${a.pace}).
OUTPUT: Chronological list — month, weeks in each, one-line why the timing works. Flag any country to skip for that season.`),
  },
  {
    id: 'multi-country',
    category: 'route',
    title: 'Multi-country route builder',
    badge: 'any',
    useCase: 'A logical, low-backtracking route between two countries at a family pace.',
    questions: [
      { id: 'start', label: 'Start country?', type: 'text', placeholder: 'e.g. Thailand' },
      { id: 'end', label: 'End country?', type: 'text', placeholder: 'e.g. Vietnam' },
      { id: 'duration', label: 'How long in total?', type: 'text', placeholder: 'e.g. 4 weeks' },
      { id: 'pace', label: 'Pace?', type: 'select', options: ['Fewer stops, deeper', 'More stops, faster'] },
    ],
    build: (a, p) => wrap(
`ROLE: Expert family route planner.
CONTEXT: ${a.start} -> ${a.end} | ${a.duration} | ${travellersStr(p)} | pace ${a.pace}.
TASK: Route for minimal backtracking, efficient transport, family pace. Suggest nights per stop.
FORMAT: Ordered stops — nights, transport between, one-line why.`),
  },
  {
    id: 'transport-compare',
    category: 'route',
    title: 'Transport comparison optimiser',
    badge: 'web',
    useCase: 'Ranks every way between two cities by cost, time and family ease.',
    questions: [
      { id: 'from', label: 'From (city)?', type: 'text', placeholder: 'e.g. Bangkok' },
      { id: 'to', label: 'To (city)?', type: 'text', placeholder: 'e.g. Chiang Mai' },
      { id: 'priority', label: 'Priority?', type: 'select', options: ['Cost', 'Time', 'Ease'] },
    ],
    build: (a, p) => wrap(
`ROLE: Regional transport expert with live web access.
CONTEXT: ${a.from} -> ${a.to} | ${travellersStr(p)} | priority ${a.priority}.${moneyRule(p)}
TASK: Compare ALL options — flight, train, bus, private transfer — for a family.
FORMAT: Table — option, cost, duration, family ease (1–5), verdict.`),
  },

  // 5. 💰 BUDGET & MONEY
  {
    id: 'true-cost',
    category: 'budget',
    title: 'True trip cost breakdown',
    badge: 'web',
    useCase: 'A full realistic cost with the hidden extras people always forget.',
    questions: [
      { id: 'destination', label: 'Where are you going?', type: 'text', placeholder: 'e.g. Japan' },
      { id: 'length', label: 'How long?', type: 'text', placeholder: 'e.g. 2 weeks' },
      { id: 'style', label: 'Travel style?', type: 'select', options: ['Budget', 'Mid-range', 'Comfort'] },
    ],
    build: (a, p) => wrap(
`ROLE: Realistic family-travel budgeter with live web access.
CONTEXT: ${a.destination} | ${a.length} | ${travellersStr(p)} | ${a.style}.${moneyRule(p)}
TASK: Break down the full realistic cost — flights, accommodation, food, transport, activities. Highlight HIDDEN costs people forget.
FORMAT: Itemised table — cost + notes. Total + daily average.`),
  },
  {
    id: 'spend-vs-save',
    category: 'budget',
    title: 'Spend vs save optimiser',
    badge: 'any',
    useCase: 'Where to splash out vs save without hurting the experience.',
    questions: [
      { id: 'destination', label: 'Where are you going?', type: 'text', placeholder: 'e.g. Maldives' },
    ],
    build: (a, p) => wrap(
`ROLE: Savvy family-travel expert.
CONTEXT: ${a.destination} | ${travellersStr(p)}.${moneyRule(p)}
TASK: Explain where it's worth spending more vs where to save without hurting the experience — specific to here and these ages.
FORMAT: "Worth it" / "Save", bullets + one-line why.`),
  },
  {
    id: 'money-brief',
    category: 'budget',
    title: 'Destination money brief',
    badge: 'web',
    useCase: 'Cash vs card, tipping, scams and a realistic daily family spend.',
    questions: [
      { id: 'destination', label: 'Where are you going?', type: 'text', placeholder: 'e.g. Vietnam' },
    ],
    build: (a, p) => wrap(
`ROLE: Local-savvy travel money expert with live web access.
CONTEXT: ${a.destination} | ${travellersStr(p)}.${moneyRule(p)}
TASK: Brief me — cash vs card norms, tipping, common tourist scams, and a realistic daily family spend.
FORMAT: 4 short sections.`),
  },

  // 🗓️ PLANNING & ITINERARY (continued) — review/pacing prompts
  {
    id: 'itinerary-critique',
    category: 'itinerary',
    title: 'Itinerary critique',
    badge: 'any',
    useCase: 'Flags what\'s unrealistic, stressful or unnecessary — and fixes it.',
    questions: [
      { id: 'destination', label: 'Where is this trip?', type: 'text', placeholder: 'e.g. Portugal' },
      { id: 'itinerary', label: 'Paste your itinerary', type: 'textarea', placeholder: 'Day 1: ...\nDay 2: ...' },
    ],
    build: (a, p) => wrap(
`ROLE: Honest family-travel expert.
CONTEXT: ${a.destination} | ${travellersStr(p)}.
INPUT:
${a.itinerary}
TASK: Flag anything unrealistic, stressful, or unnecessary for a family. Fix it.
FORMAT: Issue -> fix, bullets.`),
  },
  {
    id: 'overlooked',
    category: 'itinerary',
    title: 'Overlooked factors checker',
    badge: 'any',
    useCase: 'Catches the missing logistics, bookings and gaps that cause stress later.',
    questions: [
      { id: 'destination', label: 'Where is this trip?', type: 'text', placeholder: 'e.g. Morocco' },
      { id: 'plan', label: 'Paste your plan', type: 'textarea', placeholder: 'Outline of your trip so far' },
    ],
    build: (a, p) => wrap(
`ROLE: Detail-oriented family-travel expert.
CONTEXT: ${a.destination} | ${travellersStr(p)}.
INPUT:
${a.plan}
TASK: Identify anything MISSING that could cause stress, delays, or surprise costs — logistics, timing, gaps, bookings needed.
FORMAT: Checklist of gaps + the fix.`),
  },
  {
    id: 'downtime',
    category: 'itinerary',
    title: 'Holiday-from-the-holiday check',
    badge: 'any',
    useCase: 'Tells you if you\'ve scheduled enough downtime, or will come home exhausted.',
    questions: [
      { id: 'destination', label: 'Where is this trip?', type: 'text', placeholder: 'e.g. Sri Lanka' },
      { id: 'itinerary', label: 'Paste your itinerary', type: 'textarea', placeholder: 'Day 1: ...\nDay 2: ...' },
    ],
    build: (a, p) => wrap(
`ROLE: Family-travel pacing expert.
CONTEXT: ${a.destination} | kids aged ${agesStr(p.kidsAges)}.
INPUT:
${a.itinerary}
TASK: Is there enough downtime, or will we come home exhausted? Where to add rest/buffer days.
FORMAT: Verdict + specific tweaks.`),
  },
]

export function promptsByCategory(id: CategoryId): PromptDef[] {
  return PROMPTS.filter(p => p.category === id)
}

// ── RELATED CONTENT (guides + blogs) ───────────────────────────────
// The page builds this catalogue server-side from published guides and
// blog posts; the client matches it live against the destination the
// user types so e.g. "Sri Lanka" surfaces our Sri Lanka guide + posts.
export type RelatedContentItem = {
  type: 'guide' | 'blog'
  title: string
  href: string
  terms: string[]   // lowercased match terms (country, title)
}

// Which question answers count as a "location" for matching.
const LOCATION_QUESTION_IDS = new Set(['destination', 'region', 'to'])

export function relatedFor(
  items: RelatedContentItem[],
  answers: Record<string, string>,
  max = 4,
): RelatedContentItem[] {
  const hay = Object.entries(answers)
    .filter(([k, v]) => LOCATION_QUESTION_IDS.has(k) && v && v.trim().length >= 3)
    .map(([, v]) => v.toLowerCase())
  if (!hay.length) return []
  const matched = items.filter(it =>
    it.terms.some(t => t.length >= 4 && hay.some(h => h.includes(t) || t.includes(h))),
  )
  // Guides before blogs, then cap.
  matched.sort((a, b) => (a.type === b.type ? 0 : a.type === 'guide' ? -1 : 1))
  return matched.slice(0, max)
}
