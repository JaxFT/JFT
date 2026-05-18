// Adventure Pack content registry.
//
// FRANCE_DATA is fully populated — this is the free pack and acts as
// the quality reference for every other country pack. Other countries
// have meta entries only (so they show on the listing as "Coming soon")
// until we write their content.

import type {
  AdventurePackData, AdventurePackMeta,
} from './adventurePackTypes'

// ── FRANCE (live + free) ─────────────────────────────────────────
export const FRANCE_DATA: AdventurePackData = {
  slug: 'france',
  country: 'France',
  flag: '🇫🇷',
  isFree: true,
  heroColour: 'bg-blue-800',
  currency: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    approxGBP: 1.17,
    recommendedBudget: 20,
    budgetNote: 'Recommended: 20 €',
  },
  mapQuestions: [
    { question: 'Which continent is France on?', answer: 'Europe 🌍' },
    { question: 'What sea and ocean touch France?', answer: 'The Mediterranean Sea and the Atlantic Ocean 🌊' },
    { question: 'What is the capital of France?', answer: 'Paris — about 12 million people live in the wider Paris area.' },
    { question: 'Name 3 countries that border France', answer: 'Spain, Italy, Belgium, Germany, Switzerland and Luxembourg — pick any 3.', olderOnly: true },
    { question: 'What is the highest mountain in France (and Western Europe)?', answer: 'Mont Blanc — 4,808 metres, in the French Alps near Italy.', olderOnly: true },
  ],
  phrases: [
    { english: 'Hello', nativeScript: 'Bonjour', nativeLatin: 'Bonjour', phonetic: 'bon-zhoor', lang: 'fr' },
    { english: 'Thank you', nativeScript: 'Merci', nativeLatin: 'Merci', phonetic: 'mair-see', lang: 'fr' },
    { english: 'Please', nativeScript: "S'il vous plaît", nativeLatin: "S'il vous plaît", phonetic: 'see voo play', lang: 'fr' },
    { english: 'How much?', nativeScript: "C'est combien ?", nativeLatin: "C'est combien ?", phonetic: 'say com-bee-an', lang: 'fr' },
    { english: 'Delicious!', nativeScript: "C'est délicieux !", nativeLatin: "C'est délicieux !", phonetic: 'say day-lee-syuh', lang: 'fr' },
    { english: 'Goodbye', nativeScript: 'Au revoir', nativeLatin: 'Au revoir', phonetic: 'oh ruh-vwar', lang: 'fr' },
    { english: 'Excuse me', nativeScript: 'Excusez-moi', nativeLatin: 'Excusez-moi', phonetic: 'ex-koo-zay mwah', lang: 'fr', olderOnly: true },
    { english: 'I would like…', nativeScript: 'Je voudrais…', nativeLatin: 'Je voudrais…', phonetic: 'zhuh voo-dray', lang: 'fr', olderOnly: true },
  ],
  foods: [
    { emoji: '🥐', name: 'Croissant', description: 'Flaky, buttery breakfast pastry — best fresh from a boulangerie before 10am.' },
    { emoji: '🥖', name: 'Baguette', description: 'Long crusty bread loaf. Carry it home under your arm like a local.' },
    { emoji: '🧀', name: 'Cheese plate', description: 'France makes over 400 cheeses — try Brie, Comté, Roquefort, and one stinky one.' },
    { emoji: '🥞', name: 'Crêpes', description: 'Thin pancakes — sweet with Nutella and banana, or savoury with ham and cheese.' },
    { emoji: '🍫', name: 'Pain au chocolat', description: 'A croissant with two strips of dark chocolate inside. The breakfast of champions.' },
    { emoji: '🍲', name: 'Ratatouille', description: 'A slow-cooked vegetable stew from the south — courgettes, peppers, aubergine and tomatoes.' },
  ],
  scavengerItems: [
    { emoji: '🚲', label: 'Someone cycling with a baguette in the basket' },
    { emoji: '🥐', label: 'A boulangerie (bakery) sign' },
    { emoji: '🏛️', label: 'A statue of someone famous in a square' },
    { emoji: '🐩', label: 'A small dog being treated like a person' },
    { emoji: '⛲', label: 'A fountain' },
    { emoji: '🪟', label: 'Houses with bright blue shutters' },
    { emoji: '🥖', label: 'A queue outside a bakery' },
    { emoji: '🎨', label: 'A street artist painting or sketching' },
    { emoji: '☕', label: 'A pavement café with people watching the world go by' },
    { emoji: '🏰', label: 'A château (castle) on a hill', olderOnly: true },
    { emoji: '⚜️', label: 'The fleur-de-lis symbol on a building or sign', olderOnly: true },
    { emoji: '📜', label: 'A plaque on a wall in French — read what it says', olderOnly: true },
  ],
  geoMatches: [
    { place: 'Paris',         emoji: '🗼', description: 'The capital — the Eiffel Tower, the Louvre, the Seine, and the best croissants you will ever eat.' },
    { place: 'Provence',      emoji: '💜', description: 'Sunny south — lavender fields, olive trees, rosé wine, and pretty stone villages.' },
    { place: 'The Alps',      emoji: '🏔️', description: 'Snow-capped mountains in the east — skiing in winter, hiking and lakes in summer.' },
    { place: 'Brittany',      emoji: '🌊', description: 'Wild Atlantic coast in the west — crêpes, cider, and dramatic granite cliffs.' },
    { place: 'Loire Valley',  emoji: '🏰', description: 'Hundreds of fairy-tale castles along a river — built by kings hundreds of years ago.' },
  ],
  senses: {
    smell: 'Fresh bread, coffee, cheese, river water at dawn, sometimes Gauloise cigarettes…',
    hear:  'Church bells, café chatter, accordion music, the scrape of chairs on cobbles, "Bonjour !" everywhere…',
    taste: 'Salty butter, melting cheese, the crunch of a fresh croissant, dark chocolate, fizzy water…',
    feel:  'Cool stone in old churches, warm sun in a square, sticky pastry on your fingers, river breeze on a bridge…',
    see:   'What is the most incredible thing right in front of you right now…',
  },
  stories: [
    {
      location: '📍 Paris',
      question: 'Why does the Eiffel Tower exist?',
      body: 'The Eiffel Tower was built for the 1889 World Fair, to celebrate 100 years since the French Revolution. At the time, most Parisians HATED it. Writers signed petitions calling it an ugly iron monster. It was only supposed to stand for 20 years and then be torn down. But it turned out to be useful as a radio antenna, and slowly Parisians stopped complaining. Now around 7 million people climb it every year.',
    },
    {
      location: '📍 Everywhere in France',
      question: 'Why do the French eat so much bread?',
      body: 'Bread has been at the centre of French life for over a thousand years. There used to be a law saying every village must have a bakery within walking distance of every house. The French still eat about half a baguette per person per day. Real French bread has only four ingredients — flour, water, salt, yeast — and it goes stale within a day, which is why people buy it fresh every single morning.',
    },
    {
      location: '📍 Versailles',
      question: 'Why is the Palace of Versailles so over-the-top?',
      body: 'Versailles was built by King Louis XIV — the "Sun King" — in the 1600s. He turned a small hunting lodge into the most lavish palace in Europe, with 2,300 rooms, a hall of mirrors, and gardens so big you cannot walk them in a day. The whole point was to show off French power. He even made his nobles live there with him so he could keep an eye on them. The whole project nearly bankrupted France — and around 100 years later, that anger helped trigger the French Revolution.',
    },
    {
      location: '📍 Paris, 1789',
      question: 'What was the French Revolution?',
      body: 'In 1789, ordinary French people had had enough. The kings and nobles lived in palaces while everyone else starved. On 14 July, a Paris crowd stormed the Bastille — a prison that symbolised royal power. The revolution that followed eventually overthrew the monarchy, declared "Liberté, Égalité, Fraternité" (liberty, equality, brotherhood) and changed not just France but the whole world. That date — Bastille Day — is still France\'s biggest national holiday.',
      olderOnly: true,
      thinkingQuestion: 'The revolutionaries believed three things every person deserved: liberty, equality, and brotherhood. Which one do you think is the hardest to actually make happen?',
    },
  ],
  convoQuestions: [
    { question: 'What\'s the best thing you\'ve eaten in France so far?' },
    { question: 'What\'s one thing the French do better than back home?' },
    { question: 'What\'s one thing that\'s harder here than at home?' },
    { question: 'If you had to live in one French region forever, which one would it be?' },
    { question: 'What\'s been the biggest surprise since we got here?' },
    { question: 'What\'s one French habit you\'d like to bring home with you?', olderOnly: true },
  ],
}

// ── COUNTRY REGISTRY ────────────────────────────────────────────
// One entry per country, including the 14 not-yet-populated ones so
// the listing page shows them all (with a "Coming soon" badge).
export const PACK_META: AdventurePackMeta[] = [
  { slug: 'france',    country: 'France',    flag: '🇫🇷', isFree: true,  heroColour: 'bg-blue-800',   status: 'live' },
  { slug: 'morocco',   country: 'Morocco',   flag: '🇲🇦', isFree: false, heroColour: 'bg-amber-900',  status: 'coming-soon' },
  { slug: 'indonesia', country: 'Indonesia', flag: '🇮🇩', isFree: false, heroColour: 'bg-rose-700',   status: 'coming-soon' },
  { slug: 'thailand',  country: 'Thailand',  flag: '🇹🇭', isFree: false, heroColour: 'bg-fuchsia-700',status: 'coming-soon' },
  { slug: 'malaysia',  country: 'Malaysia',  flag: '🇲🇾', isFree: false, heroColour: 'bg-amber-700',  status: 'coming-soon' },
  { slug: 'spain',     country: 'Spain',     flag: '🇪🇸', isFree: false, heroColour: 'bg-red-700',    status: 'coming-soon' },
  { slug: 'portugal',  country: 'Portugal',  flag: '🇵🇹', isFree: false, heroColour: 'bg-emerald-800',status: 'coming-soon' },
  { slug: 'japan',     country: 'Japan',     flag: '🇯🇵', isFree: false, heroColour: 'bg-rose-800',   status: 'coming-soon' },
  { slug: 'vietnam',   country: 'Vietnam',   flag: '🇻🇳', isFree: false, heroColour: 'bg-red-800',    status: 'coming-soon' },
  { slug: 'cambodia',  country: 'Cambodia',  flag: '🇰🇭', isFree: false, heroColour: 'bg-indigo-800', status: 'coming-soon' },
  { slug: 'china',     country: 'China',     flag: '🇨🇳', isFree: false, heroColour: 'bg-red-900',    status: 'coming-soon' },
  { slug: 'india',     country: 'India',     flag: '🇮🇳', isFree: false, heroColour: 'bg-orange-700', status: 'coming-soon' },
  { slug: 'sri-lanka', country: 'Sri Lanka', flag: '🇱🇰', isFree: false, heroColour: 'bg-teal-800',   status: 'coming-soon' },
  { slug: 'nepal',     country: 'Nepal',     flag: '🇳🇵', isFree: false, heroColour: 'bg-stone-700',  status: 'coming-soon' },
  { slug: 'turkey',    country: 'Turkey',    flag: '🇹🇷', isFree: false, heroColour: 'bg-red-700',    status: 'coming-soon' },
  { slug: 'egypt',     country: 'Egypt',     flag: '🇪🇬', isFree: false, heroColour: 'bg-yellow-700', status: 'coming-soon' },
]

// Lookup table for fully-built packs.
const FULL_DATA: Record<string, AdventurePackData> = {
  france: FRANCE_DATA,
}

export function getPackData(slug: string): AdventurePackData | null {
  return FULL_DATA[slug] ?? null
}

export function getPackMeta(slug: string): AdventurePackMeta | null {
  return PACK_META.find(p => p.slug === slug) ?? null
}
