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
  // Three short traits, used as pill badges on both the result screen
  // and the shareable card image. Exists to give both of those more
  // visual substance without adding more quiz questions.
  traits: [string, string, string]
  relatedLinks: RelatedLink[]
}

export const TRAVELLER_TYPES: Record<TravellerTypeId, TravellerType> = {
  planner: {
    id: 'planner',
    name: 'The Planner',
    tagline: "You don't travel to relax, you travel with a plan, and honestly, it works.",
    description:
      "You research before you book, book before you land, and the itinerary is basically a member of the family. It's not control for its own sake, it's not wanting to waste a single day figuring things out on the ground. The trade-off is you'll never really wing it, and you don't want to.",
    traits: ['Itinerary-driven', 'Books weeks ahead', 'Loves a spreadsheet'],
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
    traits: ['Decides day by day', 'Thrives on detours', 'Plans loosely, if at all'],
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
    traits: ['Long stays, not quick hits', 'Has a ‘usual place’', 'Measures depth, not distance'],
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
    traits: ['First in the queue', 'Activity-packed days', 'A little risk is the point'],
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
    traits: ['Tracks every pound', 'Points and deals', 'Treats saving as a game'],
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
    traits: ["Kids' comfort first", 'Pays for ease', 'Pool and space, non-negotiable'],
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
    prompt: "It's a random Tuesday night while you're away, and dinner isn't sorted yet.",
    options: [
      { type: 'planner', label: "As if! That would never happen, every meal's been booked two weeks ago." },
      { type: 'wanderer', label: 'We just walk until something smells good.' },
      { type: 'settler', label: "We've got a place round the corner, they know our order by now." },
      { type: 'adventurer', label: "Whatever's closest to wherever today's activity was." },
      { type: 'hacker', label: 'Street stall, shortest queue, cheapest price, in that order.' },
      { type: 'comfort', label: "Room service. Nobody's dealing with a meltdown over dinner tonight." },
    ],
  },
  {
    id: 'stay',
    prompt: 'Someone asks how you picked where you\'re staying.',
    options: [
      { type: 'planner', label: 'Compared, reviewed, and booked weeks before we even packed.' },
      { type: 'wanderer', label: 'We looked it up on the walk from the station.' },
      { type: 'settler', label: "We're not staying, we're moving in for the month." },
      { type: 'adventurer', label: "Didn't really look, it's five minutes from the trailhead." },
      { type: 'hacker', label: 'Wherever the points covered it, obviously.' },
      { type: 'comfort', label: "There's a pool. That's the whole answer." },
    ],
  },
  {
    id: 'packing',
    prompt: "Packing night. How's it going?",
    options: [
      { type: 'planner', label: 'Finished a week ago. Colour-coded, obviously.' },
      { type: 'wanderer', label: "Everything's in a pile, we'll deal with it at the airport." },
      { type: 'settler', label: 'We packed for a season, not a trip.' },
      { type: 'adventurer', label: 'Half the bag is gear, the other half is more gear.' },
      { type: 'hacker', label: "One bag, no checked luggage, that's not negotiable." },
      { type: 'comfort', label: "There's a spare of everything. Twice." },
    ],
  },
  {
    id: 'tip',
    prompt: 'A local mentions somewhere off the map, somewhere the guidebooks missed.',
    options: [
      { type: 'planner', label: 'Noted, and slotted in for Thursday.' },
      { type: 'wanderer', label: "We're already gone, mid-sentence." },
      { type: 'settler', label: "No rush, we've got months, we'll get there." },
      { type: 'adventurer', label: 'We were basically running before they finished talking.' },
      { type: 'hacker', label: 'First question: is it free?' },
      { type: 'comfort', label: 'First question: is there a bathroom nearby?' },
    ],
  },
  {
    id: 'stress',
    prompt: "What's actually stressing you out right now?",
    options: [
      { type: 'planner', label: "Not knowing what tomorrow looks like yet." },
      { type: 'wanderer', label: 'Someone made us commit to a time.' },
      { type: 'settler', label: "We've moved three times this week, it's exhausting." },
      { type: 'adventurer', label: "We haven't done anything today. Nothing. All day." },
      { type: 'hacker', label: 'I think we overspent. I need to check.' },
      { type: 'comfort', label: "Someone's tired, hungry, and about to lose it." },
    ],
  },
  {
    id: 'success',
    prompt: "Trip's over. What made it a win?",
    options: [
      { type: 'planner', label: 'Everything ran exactly on schedule.' },
      { type: 'wanderer', label: "We did something we couldn't have planned if we'd tried." },
      { type: 'settler', label: 'It stopped feeling like a holiday and started feeling like home.' },
      { type: 'adventurer', label: 'We did the whole list. Then did it again.' },
      { type: 'hacker', label: "We came home under budget. That's the real trophy." },
      { type: 'comfort', label: "Nobody cried. Not even the adults." },
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
