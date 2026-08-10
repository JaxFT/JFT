// Content for the "What Kind of Traveller Are You" quiz. Kept separate
// from the client component so the copy can be edited without touching
// the quiz mechanics, and so the result-lookup-by-id logic used by the
// share-link flow (?type=) has one source of truth.
//
// Deliberately distinct from the "Family Way" tool: that one is a long,
// serious readiness assessment gated toward Premium. This is a fast,
// shareable, top-of-funnel quiz, six questions, six types, no signup
// required to see your result.

export type TravellerTypeId = 'planner' | 'wanderer' | 'settler' | 'adventurer' | 'hacker' | 'comfort'

export type RelatedLink = { href: string; title: string }

export type TravellerType = {
  id: TravellerTypeId
  name: string
  tagline: string
  description: string
  relatedLinks: RelatedLink[]
}

export const TRAVELLER_TYPES: Record<TravellerTypeId, TravellerType> = {
  planner: {
    id: 'planner',
    name: 'The Planner',
    tagline: "You don't travel to relax, you travel with a plan, and honestly, it works.",
    description:
      "You research before you book, book before you land, and the itinerary is basically a member of the family. It's not control for its own sake, it's not wanting to waste a single day figuring things out on the ground. The trade-off is you'll never really wing it, and you don't want to.",
    relatedLinks: [
      { href: '/blog/the-travel-spreadsheet-finally-broke-us', title: 'The Travel Spreadsheet Finally Broke Us' },
      { href: '/guides/sri-lanka-family-guide', title: 'The Real Sri Lanka Family Guide' },
    ],
  },
  wanderer: {
    id: 'wanderer',
    name: 'The Spontaneous Wanderer',
    tagline: "The plan is that there isn't one.",
    description:
      "You'd rather stand in a station and pick a direction than follow someone else's itinerary. Some of your best days happened because you changed your mind at the last minute, and you wouldn't have it any other way. The risk is the odd wasted afternoon, the upside is the stories nobody else has.",
    relatedLinks: [
      { href: '/blog/why-we-started-morocco-by-train-then-hired-a-car-halfway-through', title: 'Why We Started Morocco By Train, Then Hired a Car Halfway Through' },
      { href: '/blog/the-creepiest-film-set-you-ll-drive-past-in-morocco-and-probably-stop-at', title: "The Creepiest Film Set You'll Drive Past in Morocco (and Probably Stop At)" },
    ],
  },
  settler: {
    id: 'settler',
    name: 'The Slow Settler',
    tagline: "You don't visit places, you live in them for a while.",
    description:
      'Long stays over quick hits, unpacking properly over living out of a bag, a coffee spot you go back to over a checklist of sights. You measure a trip by how well you got to know somewhere, not by how many places you saw.',
    relatedLinks: [
      { href: '/blog/the-george-town-breakfast-spot-we-kept-going-back-to', title: 'The George Town breakfast spot we kept going back to' },
      { href: '/blog/fast-travel-vs-slow-travel-why-we-ve-ended-up-doing-both', title: "Fast Travel vs Slow Travel, Why We've Ended Up Doing Both" },
    ],
  },
  adventurer: {
    id: 'adventurer',
    name: 'The Adventure Chaser',
    tagline: 'A slow day is a wasted day.',
    description:
      "You didn't come this far to sit by a pool. If there's a hike, a dive, a safari, or something with a mild element of risk, you're first in the queue, kids in tow. The itinerary bends around whatever the biggest experience on offer is, and everyone comes home a little more tired and a little more sure it was worth it.",
    relatedLinks: [
      { href: '/blog/the-time-jax-dislocated-his-elbow-halfway-up-a-mountain-in-nepal', title: 'The Time Jax Dislocated His Elbow Halfway Up a Mountain in Nepal' },
      { href: '/blog/our-favourite-safari-so-far-a-full-day-in-chitwan-national-park-nepal', title: 'Our Favourite Safari So Far: A Full Day in Chitwan National Park, Nepal' },
    ],
  },
  hacker: {
    id: 'hacker',
    name: 'The Budget Hacker',
    tagline: "The trip's not over until you know exactly what it cost.",
    description:
      "You treat every pound like it has to earn its place in the budget, not because you have to, but because it's the game. Points, deals, free days, and a running total you actually enjoy checking. You'll happily skip the taxi if it means bragging rights on how little the day cost.",
    relatedLinks: [
      { href: '/guides/how-to-save-blueprint', title: 'How We Saved for Full-Time Travel, The Blueprint' },
      { href: '/blog/the-difference-between-holiday-spending-and-travel-spending', title: 'The Difference Between Holiday Spending And Travel Spending' },
    ],
  },
  comfort: {
    id: 'comfort',
    name: 'The Comfort-First Family',
    tagline: "Everyone's happier when nobody's uncomfortable.",
    description:
      "You've done the hostel-with-kids thing, or you've heard about it, and made your peace with paying more for the version where everyone sleeps and nobody melts down at 3pm. A pool, a proper bed, and air conditioning aren't luxuries, they're what makes the rest of the day possible.",
    relatedLinks: [
      { href: '/blog/a-very-different-kind-of-family-hotel-stay-at-hard-rock-hotel-penang', title: 'A Very Different Kind of Family Hotel Stay at Hard Rock Hotel Penang' },
      { href: '/blog/two-nights-in-the-sahara-at-a-luxury-desert-camp', title: 'Two Nights in the Sahara At A Luxury Desert Camp' },
    ],
  },
}

export const TRAVELLER_TYPE_ORDER: TravellerTypeId[] = ['planner', 'wanderer', 'settler', 'adventurer', 'hacker', 'comfort']

export type QuizOption = { label: string; type: TravellerTypeId }
export type QuizQuestion = { id: string; prompt: string; options: QuizOption[] }

// Every question offers exactly one option per type, so tallying is a
// straight count with no weighting logic to maintain.
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'evening',
    prompt: "It's 6pm and dinner isn't sorted yet. What happens?",
    options: [
      { type: 'planner', label: 'We booked somewhere two weeks ago.' },
      { type: 'wanderer', label: 'We wander until something looks good.' },
      { type: 'settler', label: "We've been here three weeks, we have ‘our place’." },
      { type: 'adventurer', label: "Whatever's nearest to today's activity." },
      { type: 'hacker', label: 'Street food, shortest queue, best price.' },
      { type: 'comfort', label: 'Somewhere the kids can actually sit still.' },
    ],
  },
  {
    id: 'stay',
    prompt: "How do you pick where you're staying?",
    options: [
      { type: 'planner', label: 'Reviews, location, and price, compared for days before booking.' },
      { type: 'wanderer', label: "Whatever's free when we roll into town." },
      { type: 'settler', label: 'A monthly rental, we properly move in.' },
      { type: 'adventurer', label: "Don't care, as long as it's near what we're doing." },
      { type: 'hacker', label: 'Wherever the points or the deal take us.' },
      { type: 'comfort', label: 'Pool and space are non-negotiable, price is secondary.' },
    ],
  },
  {
    id: 'packing',
    prompt: "What's your packing style?",
    options: [
      { type: 'planner', label: 'A list, colour-coded, finished a week early.' },
      { type: 'wanderer', label: "Thrown in the night before, we'll figure it out." },
      { type: 'settler', label: 'We packed for a season, not a trip.' },
      { type: 'adventurer', label: "Gear-heavy, ready for whatever we're doing." },
      { type: 'hacker', label: 'Ruthlessly light, checked bags cost money.' },
      { type: 'comfort', label: "Extra of everything, the kids' comfort items are non-negotiable." },
    ],
  },
  {
    id: 'tip',
    prompt: 'A local tells you about somewhere off the map. You...',
    options: [
      { type: 'planner', label: 'Add it to the itinerary for day four.' },
      { type: 'wanderer', label: 'Go right now, plans be damned.' },
      { type: 'settler', label: "File it away, you're not leaving for months, you'll get there." },
      { type: 'adventurer', label: 'Are already halfway out the door.' },
      { type: 'hacker', label: "Ask if it's free first." },
      { type: 'comfort', label: "Ask if there's a bathroom and shade first." },
    ],
  },
  {
    id: 'stress',
    prompt: 'What actually stresses you out on a trip?',
    options: [
      { type: 'planner', label: 'Not having a plan.' },
      { type: 'wanderer', label: 'Having too rigid a plan.' },
      { type: 'settler', label: 'Constantly moving, never settling.' },
      { type: 'adventurer', label: 'A slow day with nothing booked.' },
      { type: 'hacker', label: 'Overspending.' },
      { type: 'comfort', label: 'The kids being uncomfortable or overtired.' },
    ],
  },
  {
    id: 'success',
    prompt: 'Success at the end of a trip looks like...',
    options: [
      { type: 'planner', label: 'Everything went to plan.' },
      { type: 'wanderer', label: "We did something we never could've planned for." },
      { type: 'settler', label: 'It felt like we actually lived somewhere, not just visited.' },
      { type: 'adventurer', label: 'We did everything on the list, twice.' },
      { type: 'hacker', label: 'We came in under budget.' },
      { type: 'comfort', label: 'Nobody had a meltdown.' },
    ],
  },
]

// Tally answers and return the winning type. Ties are broken by
// TRAVELLER_TYPE_ORDER, earliest wins, arbitrary but deterministic and
// good enough for a fun quiz, not a scientific instrument.
export function tallyResult(answers: TravellerTypeId[]): TravellerTypeId {
  const counts: Record<TravellerTypeId, number> = {
    planner: 0, wanderer: 0, settler: 0, adventurer: 0, hacker: 0, comfort: 0,
  }
  for (const a of answers) counts[a]++
  let best: TravellerTypeId = TRAVELLER_TYPE_ORDER[0]
  for (const id of TRAVELLER_TYPE_ORDER) {
    if (counts[id] > counts[best]) best = id
  }
  return best
}
