// Per-section prompt builders for the guide wizard. Each function
// returns a single string that the admin copies into Claude/ChatGPT.
// The AI response is pasted back into the wizard and saved as the
// section's body markdown. Voice profile is the same one used by the
// blog wizard so everything on the site sounds like one writer.

import { VOICE_PROFILE } from '@/lib/voice-profile'

// Guide-specific additions on top of the shared voice profile:
// formatting rules and callout tokens that the renderer styles.
const GUIDE_FORMATTING_RULES = `TASK: Write one section of a long-form destination guide using the voice profile above. The guide is for JaxFamilyTravels.com — Bec, Oli, and their son Jax — and should feel like advice from a friend who actually did the trip with a kid.

FORMATTING RULES — important:
- Use markdown headings: ## for major sub-sections, ### for smaller ones.
- Use **bold** for emphasis sparingly.
- For practical callouts, use a single line starting with one of these tokens at the start (we style them on the site):
   "**PRO TIP:** ..." for tips you wish you'd known
   "**DISCOUNT:** ..." for affiliate codes / discounts
   "**AVOID:** ..." for warnings / things not to do
   "**HONEST TAKE:** ..." for the closing opinion paragraph
- For tables of prices / times / comparisons, use real markdown tables (header row + separator row).
- For lists of things to do or eat, ordinary bullet lists are fine.

OUTPUT FORMAT: Return ONLY the markdown section body. NO frontmatter. NO outer code fences. NO preamble like "Here is the section". Start with the first heading or paragraph of the section.`

const VOICE_AND_RULES = `${VOICE_PROFILE}

${GUIDE_FORMATTING_RULES}`

const WORD_TARGET = (min: number, max: number) => {
  const cap = Math.round(max * 1.1)
  return `LENGTH — STRICT CAP, not a goal:
Target: roughly ${min}–${max} words. HARD CEILING: ${cap} words. Going under is fine — padding to hit a length is a failure.
Specifically forbidden waffle: generic atmospheric openers, "what we learned" reflections, re-stating points in different words, "and speaking of…" linker sentences.`
}

function joinNotes(notes: string, fallback = '(no notes provided — write a brief, honest version using common knowledge of the country)') {
  return notes.trim() ? notes.trim() : fallback
}

export function buildWhyPrompt(opts: {
  country: string
  title: string
  notes: string
}): string {
  return `${VOICE_AND_RULES}

SECTION: "Why ${opts.country}"
This is the chapter that comes early in the guide and answers: why this country is worth visiting AS A FAMILY. What surprised us. What worked with kids. The honest reasons it works.

CONTEXT:
Guide title: ${opts.title}
Country: ${opts.country}
Bec and Oli's raw notes: ${joinNotes(opts.notes)}

STRUCTURE:
- Start with one short paragraph framing the worries we had before going (safety, food, chaos) and what we actually found.
- Then 3–5 sub-sections, each with a short ### heading and 2–4 punchy paragraphs. Examples of sub-section themes (use what fits, don't force it): "There's lots for kids to do", "Getting around is easy", "People love kids here", "Beaches are perfect for families", "It's affordable", "Adventurous but not overwhelming".
- End with a short HONEST TAKE callout summarising why we'd go back.

${WORD_TARGET(600, 900)}`
}

export function buildHighlightsPrompt(opts: {
  country: string
  notes: string
}): string {
  return `${VOICE_AND_RULES}

SECTION: "Destination Highlights"
A short scannable page that gives newcomers the quick map of the country: where to base, must-sees, and the headline experiences. Comes right after "Why ${opts.country}".

CONTEXT:
Country: ${opts.country}
Bec and Oli's raw notes (places loved, must-sees, headline activities): ${joinNotes(opts.notes)}

STRUCTURE:
- Open with a single confident one-liner setting the tone for the country (no clichés).
- Three short labelled sub-sections, each with a ### heading and a tight bullet list:
   ### Top spots
   ### Must-sees
   ### Highlights
- Each bullet: a place name in **bold** followed by a short reason, ideally something specific.
- No long paragraphs in this section. Keep it scannable.

${WORD_TARGET(180, 320)}`
}

export function buildNeedToKnowsPrompt(opts: {
  country: string
  notes: string
}): string {
  return `${VOICE_AND_RULES}

SECTION: "Need to Knows"
The practical-things-we-wish-we'd-known chapter. Honest, specific, no fluff. Examples of topics to cover (only if relevant): visas, eSIM vs local SIM, WiFi reality, plug types, cash & ATM fees, medical centres, mosquitoes, spice levels, eating out vs groceries, alcohol rules, scams. Always include local prices in local currency AND GBP where you mention them.

CONTEXT:
Country: ${opts.country}
Bec and Oli's raw notes: ${joinNotes(opts.notes)}

STRUCTURE:
- For each topic, use a ### heading and 1–3 short paragraphs.
- Where there are specific recommendations, name them: brand names of SIMs, names of supermarkets, specific repellents that worked.
- Use **DISCOUNT:** callouts for any affiliate codes mentioned in the notes (verbatim wording from the notes — do not invent codes).
- Use **PRO TIP:** for genuinely useful tips you'd whisper to a friend.

${WORD_TARGET(800, 1400)}`
}

export function buildDestinationPrompt(opts: {
  country: string
  destinationName: string
  notes: string
}): string {
  return `${VOICE_AND_RULES}

SECTION: A destination chapter on "${opts.destinationName}" (${opts.country}).
This follows the same shape every destination uses in the guide.

CONTEXT:
Country: ${opts.country}
Destination: ${opts.destinationName}
Bec and Oli's raw notes: ${joinNotes(opts.notes)}

STRUCTURE (use these sub-headings, in this order, skip any you genuinely have no info for):
### What ${opts.destinationName} is like
A short, atmospheric paragraph or two. Honest, including what we didn't love.

### Who ${opts.destinationName} is best for
A short bullet list. End with a one-liner like "It's less ideal if you're looking for…" when relevant.

### Where we stayed
Name, type (Airbnb / homestay / hotel), price per night and total, how long we stayed, what we liked, what we didn't love. Keep specific numbers.

### Where to eat
Group as bullet sub-sections: cheap local eats, western/cafés, kid-friendly spots. Include typical prices in local + GBP. Name places.

### Things to do / Activities
Each activity gets a ### or **bold** sub-heading with practical details: where, drive time, cost, what to bring, what to expect with kids. Use **PRO TIP:** lines for the small but useful tips.

### Discount codes (only if any are in the notes)
Use **DISCOUNT:** callout lines verbatim from the notes — do not invent.

### Should ${opts.destinationName} be on your itinerary?
A direct yes / no / "as a stopover" answer with one short paragraph of reasoning.

### Our honest take
A **HONEST TAKE:** callout — one or two short paragraphs. Could include what we'd do differently.

${WORD_TARGET(800, 1500)}`
}

export function buildThemedSectionPrompt(opts: {
  country: string
  title: string
  notes: string
}): string {
  return `${VOICE_AND_RULES}

SECTION: A themed cross-cutting chapter titled "${opts.title}" (${opts.country}).
This is not tied to a single destination — it's a thematic chapter like "Choosing the Right Safari", "Places to Avoid", "Renting a Tuk-Tuk".

CONTEXT:
Country: ${opts.country}
Title: ${opts.title}
Bec and Oli's raw notes: ${joinNotes(opts.notes)}

STRUCTURE:
- Open with a short framing paragraph: why this chapter exists.
- Use ### sub-headings to compare options, list pros/cons, or walk through experiences in chronological order — whatever the topic calls for.
- Use **PRO TIP:**, **AVOID:**, **DISCOUNT:**, and **HONEST TAKE:** callouts where they fit.
- Include exact prices, drive times, etc. where the notes have them.
- End with a short HONEST TAKE if you have a clear opinion.

${WORD_TARGET(500, 1200)}`
}

export function buildFinalThoughtsPrompt(opts: {
  country: string
  notes: string
}): string {
  return `${VOICE_AND_RULES}

SECTION: "Final Thoughts" — the closing chapter of a ${opts.country} family guide.
Reflective, warm, honest. The reader has been through the whole guide; this is the goodbye.

CONTEXT:
Country: ${opts.country}
Bec and Oli's raw notes / reflections: ${joinNotes(opts.notes)}

STRUCTURE:
- No headings inside this section — just flowing paragraphs.
- Open with one specific observation about what ${opts.country} asks of families.
- Be honest about what was hard as well as what was beautiful.
- Mention "you don't have to see everything" / "let the route evolve" / similar real travel wisdom — but only if it fits naturally.
- Close with one final small piece of advice and an Instagram sign-off: "If you have found our guide helpful, please let us know, we are @jax.familytravels on Instagram"

${WORD_TARGET(300, 500)}`
}

// Cover image prompt — given to the admin to paste into Midjourney /
// DALL-E / Stable Diffusion themselves. Locks the style to match the
// Sri Lanka cover (illustrated map of the country with cultural icons).
export function buildCoverImagePrompt(opts: { country: string; title: string }): string {
  return `Illustrated travel-poster style cover image for a family travel guide called "${opts.title}".

Subject: a stylised, hand-drawn illustration of ${opts.country} shaped like its actual country silhouette, viewed from above. The country shape is filled with a warm sandy / mustard yellow. Scattered across the country are small, friendly cartoon icons of culturally and visually iconic things from ${opts.country}: animals, landmarks, food, transport, traditional buildings — drawn in a consistent illustrated style.

Style: flat colour illustration with soft outlines, warm cosy palette (sandy yellow base, muted greens for vegetation, terracotta reds, ocean blue for surrounding water), gentle textures, gouache-paint feel. No photorealism. No 3D rendering. Friendly, family-friendly, slightly hand-painted.

Composition: portrait orientation (3:4 or 2:3). Country shape centred, surrounding ocean visible on at least two sides. Country name "${opts.country}" hand-lettered across the top of the image in a friendly script. Generous negative space — do not over-fill with icons. No people or human faces. No text other than the country name. No website URLs, no logos, no watermarks.

Output: high resolution, suitable for use as the top of a digital travel guide.`
}
