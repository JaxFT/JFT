// Adventure Pack content registry.
//
// FRANCE_DATA is fully populated. This is the free pack and acts as
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
  heroColour: 'bg-brand-900',
  currency: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    recommendedBudget: 20,
    budgetNote: 'Recommended: 20 €',
  },
  mapQuestions: [
    { question: 'Which continent is France on?', answer: 'Europe 🌍' },
    { question: 'What sea and ocean touch France?', answer: 'The Mediterranean Sea and the Atlantic Ocean 🌊' },
    { question: 'What is the capital of France?', answer: 'Paris. About 12 million people live in the wider Paris area.' },
    { question: 'Name 3 countries that border France', answer: 'Spain, Italy, Belgium, Germany, Switzerland and Luxembourg. Pick any 3.', olderOnly: true },
    { question: 'What is the highest mountain in France (and Western Europe)?', answer: 'Mont Blanc, 4,808 metres, in the French Alps near Italy.', olderOnly: true },
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
    { emoji: '🥐', name: 'Croissant', description: 'Flaky, buttery breakfast pastry, best fresh from a boulangerie before 10am.' },
    { emoji: '🥖', name: 'Baguette', description: 'Long crusty bread loaf. Carry it home under your arm like a local.' },
    { emoji: '🧀', name: 'Cheese plate', description: 'France makes over 400 cheeses. Try Brie, Comté, Roquefort, and one stinky one.' },
    { emoji: '🥞', name: 'Crêpes', description: 'Thin pancakes, sweet with Nutella and banana, or savoury with ham and cheese.' },
    { emoji: '🍫', name: 'Pain au chocolat', description: 'A croissant with two strips of dark chocolate inside. The breakfast of champions.' },
    { emoji: '🍲', name: 'Ratatouille', description: 'A slow-cooked vegetable stew from the south, with courgettes, peppers, aubergine and tomatoes.' },
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
    { emoji: '📜', label: 'A plaque on a wall in French, read what it says', olderOnly: true },
  ],
  geoMatches: [
    { place: 'Paris',         emoji: '🗼', description: 'The capital. The Eiffel Tower, the Louvre, the Seine, and the best croissants you will ever eat.' },
    { place: 'Provence',      emoji: '💜', description: 'Sunny south, with lavender fields, olive trees, rosé wine, and pretty stone villages.' },
    { place: 'The Alps',      emoji: '🏔️', description: 'Snow-capped mountains in the east. Skiing in winter, hiking and lakes in summer.' },
    { place: 'Brittany',      emoji: '🌊', description: 'Wild Atlantic coast in the west, with crêpes, cider, and dramatic granite cliffs.' },
    { place: 'Loire Valley',  emoji: '🏰', description: 'Hundreds of fairy-tale castles along a river, built by kings hundreds of years ago.' },
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
      body: 'Bread has been at the centre of French life for over a thousand years. There used to be a law saying every village must have a bakery within walking distance of every house. The French still eat about half a baguette per person per day. Real French bread has only four ingredients (flour, water, salt, yeast) and it goes stale within a day, which is why people buy it fresh every single morning.',
    },
    {
      location: '📍 Versailles',
      question: 'Why is the Palace of Versailles so over-the-top?',
      body: 'Versailles was built by King Louis XIV (the "Sun King") in the 1600s. He turned a small hunting lodge into the most lavish palace in Europe, with 2,300 rooms, a hall of mirrors, and gardens so big you cannot walk them in a day. The whole point was to show off French power. He even made his nobles live there with him so he could keep an eye on them. The whole project nearly bankrupted France, and around 100 years later, that anger helped trigger the French Revolution.',
    },
    {
      location: '📍 Paris, 1789',
      question: 'What was the French Revolution?',
      body: 'In 1789, ordinary French people had had enough. The kings and nobles lived in palaces while everyone else starved. On 14 July, a Paris crowd stormed the Bastille, a prison that symbolised royal power. The revolution that followed eventually overthrew the monarchy, declared "Liberté, Égalité, Fraternité" (liberty, equality, brotherhood) and changed not just France but the whole world. That date, Bastille Day, is still France\'s biggest national holiday.',
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

// ── MOROCCO (premium, live) ──────────────────────────────────────
export const MOROCCO_DATA: AdventurePackData = {
  slug: 'morocco',
  country: 'Morocco',
  flag: '🇲🇦',
  isFree: false,
  heroColour: 'bg-amber-900',
  currency: {
    code: 'MAD',
    name: 'Moroccan Dirham',
    symbol: 'DH',
    recommendedBudget: 40,
    budgetNote: 'Recommended: 40 DH',
  },
  mapQuestions: [
    { question: 'Which continent is Morocco on?', answer: 'Africa, in the north-west corner closest to Europe 🌍' },
    { question: 'What sea and ocean touch Morocco?', answer: 'The Atlantic Ocean on the west and the Mediterranean Sea on the north 🌊' },
    { question: 'What is the capital of Morocco?', answer: 'Rabat. Most people guess Marrakech or Casablanca, but the capital is actually Rabat on the Atlantic coast.' },
    { question: 'Which big country borders Morocco to the east?', answer: 'Algeria. The border has been closed since 1994, you cannot cross it.', olderOnly: true },
    { question: 'What is the highest mountain in Morocco?', answer: 'Mount Toubkal, 4,167 metres, in the High Atlas mountains south of Marrakech. People climb it in two days.', olderOnly: true },
    { question: 'What huge desert covers part of Morocco?', answer: 'The Sahara, the largest hot desert in the world. It stretches across ten countries.', olderOnly: true },
  ],
  phrases: [
    { english: 'Hello (peace)', nativeScript: 'السلام عليكم', nativeLatin: 'Salam aleikum', phonetic: 'sa-LAM a-LAY-koom', lang: 'ar' },
    { english: 'Thank you', nativeScript: 'شكرا', nativeLatin: 'Shukran', phonetic: 'SHOOK-ran', lang: 'ar' },
    { english: 'Please', nativeScript: 'عافاك', nativeLatin: 'Afak', phonetic: 'AH-fak', lang: 'ar' },
    { english: 'How much?', nativeScript: 'بشحال؟', nativeLatin: 'Bshhal?', phonetic: 'b-SHAH-al', lang: 'ar' },
    { english: 'Delicious!', nativeScript: 'بنين!', nativeLatin: 'Bnin!', phonetic: 'b-NEEN', lang: 'ar' },
    { english: 'Goodbye', nativeScript: 'بسلامة', nativeLatin: 'Beslama', phonetic: 'bess-LAH-ma', lang: 'ar' },
    { english: 'No thank you', nativeScript: 'لا شكرا', nativeLatin: 'La, shukran', phonetic: 'lah SHOOK-ran', lang: 'ar', olderOnly: true },
    { english: 'I would like…', nativeScript: '…بغيت', nativeLatin: 'Bghit…', phonetic: 'b-GHEET', lang: 'ar', olderOnly: true },
  ],
  foods: [
    { emoji: '🍲', name: 'Tagine', description: 'Slow-cooked stew named after the conical clay pot it cooks in. Chicken with preserved lemon, or lamb with prunes, are classics.' },
    { emoji: '🍵', name: 'Mint tea', description: 'Sweet green tea with fresh mint, poured from high up into small glasses. Refuse a glass at your own peril, it is offered everywhere.' },
    { emoji: '🍛', name: 'Couscous', description: 'Tiny steamed pasta with vegetables, chickpeas, and usually lamb or chicken. Traditionally eaten on Fridays after midday prayer.' },
    { emoji: '🥖', name: 'Khobz', description: 'Round flat bread, baked fresh every morning. Used as a spoon to scoop up tagine. Forks are optional, bread is not.' },
    { emoji: '🥧', name: 'Pastilla', description: 'A sweet-and-savoury pie. Shredded chicken or pigeon inside, dusted with cinnamon and icing sugar on top. Sounds wrong, tastes amazing.' },
    { emoji: '🫒', name: 'Olives & preserved lemons', description: 'Bowls of them on every table. The lemons are salted whole and left for weeks, they taste nothing like a fresh lemon.' },
  ],
  scavengerItems: [
    { emoji: '🫖', label: 'Mint tea being poured from really high up' },
    { emoji: '🐈', label: 'A cat curled up asleep in the medina (there are a LOT of cats)' },
    { emoji: '🚪', label: 'A bright blue painted door' },
    { emoji: '🐴', label: 'A donkey carrying things through narrow alleys' },
    { emoji: '🧵', label: 'A handmade Berber rug or carpet' },
    { emoji: '🟫', label: 'A clay tagine pot stacked outside a shop' },
    { emoji: '⛲', label: 'A fountain covered in colourful geometric tiles (zellige)' },
    { emoji: '🌿', label: 'A pile of fresh mint at a market stall' },
    { emoji: '🕌', label: 'A minaret (tall mosque tower) above the rooftops' },
    { emoji: '🧶', label: 'A craftsperson hammering brass or weaving on a loom', olderOnly: true },
    { emoji: '⭐', label: 'The five-pointed star on the Moroccan flag, on a building or sign', olderOnly: true },
    { emoji: '🧭', label: 'A moment where you are completely lost in the medina (it will happen)', olderOnly: true },
  ],
  geoMatches: [
    { place: 'Marrakech',     emoji: '🌆', description: 'The red city. Famous medina, snake charmers and storytellers in the huge Jemaa el-Fna square, and souks that go on forever.' },
    { place: 'Fez',           emoji: '🏛️', description: 'The oldest medina in the world, a 1,200-year-old maze of 9,000 alleys. Home to the world\'s oldest still-running university.' },
    { place: 'Chefchaouen',   emoji: '🔵', description: 'A small mountain town where almost every wall is painted blue. Nobody fully agrees on why.' },
    { place: 'The Sahara',    emoji: '🐪', description: 'Vast orange sand dunes in the south-east. People ride camels and sleep in Berber tents under the stars.' },
    { place: 'Atlas Mountains', emoji: '🏔️', description: 'Tall snow-capped mountains running across the country. Berber villages cling to the valleys.' },
    { place: 'Essaouira',     emoji: '🌊', description: 'Windswept Atlantic coast town. Blue fishing boats, fresh seafood, and a constant breeze that makes the heat bearable.' },
  ],
  senses: {
    smell: 'Mint, cumin and cinnamon in the souk, leather from the tanneries, sweet pastries, charcoal smoke from grills, sometimes diesel and donkey…',
    hear:  'The call to prayer five times a day, sellers shouting prices, motorbikes weaving through alleys, the slap of bread dough, "Bonjour my friend!" from every shop…',
    taste: 'Very sweet mint tea, salty olives, warm cinnamon on pastilla, the crunch of fresh bread, sticky honey pastries, the deep slow flavour of tagine…',
    feel:  'Cool tile underfoot in a riad, warm desert sand between your toes, the scratch of a wool rug, sticky midday heat in the medina, sudden cold at night in the mountains…',
    see:   'What is the most incredible thing right in front of you right now…',
  },
  stories: [
    {
      location: '📍 Marrakech',
      question: 'Why is Jemaa el-Fna square so wild?',
      body: 'Jemaa el-Fna is the huge square in the middle of Marrakech and it has been a meeting place for nearly a thousand years. During the day it is full of orange-juice carts, snake charmers and henna painters. At sunset the food stalls roll in and the whole square turns into a smoky open-air restaurant with hundreds of tables. UNESCO actually protects the square as "intangible heritage" because of its storytellers, the men in robes who sit in a circle and tell tales from memory, a tradition that goes back centuries.',
    },
    {
      location: '📍 Fez',
      question: 'Why is the medina of Fez so confusing?',
      body: 'The medina of Fez is the oldest still-living medieval city in the world, built more than 1,200 years ago. It has around 9,000 alleys, some so narrow you have to turn sideways. There are no cars inside, the only deliveries are by donkey or handcart. The alleys were deliberately designed to confuse invaders, and they still confuse everyone else. Locals say if you ask a child for directions, give them a coin. If they ask first, give them nothing, they will probably take you in circles.',
    },
    {
      location: '📍 Fez',
      question: 'What is the oldest university in the world?',
      body: 'It is here in Fez. The University of al-Qarawiyyin was founded in the year 859, more than 1,100 years ago, which makes it older than Oxford and Cambridge. The wild bit: it was founded by a woman named Fatima al-Fihri, who used her inheritance to build a school and mosque for her community. It is still operating today as both a mosque and a university, and the building has been continuously running longer than almost anything else on earth.',
      olderOnly: true,
      thinkingQuestion: 'Fatima built a school instead of keeping the money. If someone gave you a huge amount of money but said you had to spend it on something for other people, what would you build?',
    },
    {
      location: '📍 Chefchaouen',
      question: 'Why is the whole town painted blue?',
      body: 'Chefchaouen sits high in the Rif Mountains, and almost every wall, door and step is painted some shade of blue. Nobody fully agrees on why. The most popular story is that Jewish refugees who came here in the 1930s brought a tradition of painting buildings blue to symbolise the sky and heaven. Other people say the blue keeps mosquitoes away, or that it keeps the houses cool in summer. Whatever the real answer, the town now has to repaint itself every few months to keep it looking right.',
    },
    {
      location: '📍 The Sahara',
      question: 'Who lives in the desert?',
      body: 'The Berbers, who call themselves Amazigh meaning "free people", have lived in north Africa for thousands of years, long before Arabs arrived. In the Sahara some of them are still nomads, moving with camels and goats between water sources. They navigate by stars, and they have a tea ritual where the first glass is poured bitter, the second sweeter, and the third sweetest of all. The saying goes: "the first is bitter like life, the second is sweet like love, the third is gentle like death." They serve all three to any visitor, and you are meant to drink all three.',
      olderOnly: true,
    },
  ],
  convoQuestions: [
    { question: 'What\'s the best thing you\'ve eaten in Morocco so far?' },
    { question: 'What\'s harder here than at home?' },
    { question: 'If we got separated in the medina, what would you do?' },
    { question: 'How did haggling for something go? Did you get a fair price?' },
    { question: 'Which place has felt the most different from home?' },
    { question: 'Would you rather live in a busy city like Marrakech, or a quiet mountain village in the Atlas?', olderOnly: true },
  ],
}

// ── COUNTRY REGISTRY ────────────────────────────────────────────
// One entry per country, including the 14 not-yet-populated ones so
// the listing page shows them all (with a "Coming soon" badge).
export const PACK_META: AdventurePackMeta[] = [
  { slug: 'france',    country: 'France',    flag: '🇫🇷', isFree: true,  heroColour: 'bg-brand-900',  status: 'live' },
  { slug: 'morocco',   country: 'Morocco',   flag: '🇲🇦', isFree: false, heroColour: 'bg-amber-900',  status: 'live' },
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
  morocco: MOROCCO_DATA,
}

export function getPackData(slug: string): AdventurePackData | null {
  return FULL_DATA[slug] ?? null
}

export function getPackMeta(slug: string): AdventurePackMeta | null {
  return PACK_META.find(p => p.slug === slug) ?? null
}
