// Per-block prompt builders for the guide wizard. Each function
// returns a single string that the admin copies into Claude/ChatGPT.
// The AI response is pasted back into the wizard and saved as the
// block's body markdown. Voice profile is the same one used by the
// blog wizard so everything on the site sounds like one writer.
//
// All builders are heading + scope driven — there is no longer any
// hardcoded "Why <country>" / "Final thoughts" wording. The admin
// types the heading they want, picks the kind (intro / destination /
// themed / closing), and the prompt is built around that.

import { VOICE_PROFILE } from '@/lib/voice-profile'
import type { GuideBlockKind } from '@/lib/guide-types'

// Guide-specific additions on top of the shared voice profile:
// formatting rules and callout tokens that the renderer styles.
const GUIDE_FORMATTING_RULES = `TASK: Write one section of a long-form family guide using the voice profile above. The guide is for JaxFamilyTravels.com — Bec, Oli, and their son Jax — and should feel like advice from a friend who actually lived it with a kid.

FORMATTING RULES — important:
- Use markdown headings: ## for major sub-sections, ### for smaller ones. Do NOT repeat the top-level section heading — the site renders it for you.
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

function joinNotes(notes: string, fallback = '(no notes provided — write a brief, honest version using what you know)') {
  return notes.trim() ? notes.trim() : fallback
}

// Describes the guide's scope. May be a country, a theme like
// "world schooling", or empty.
function scopeLine(guideTitle: string, scope: string | null | undefined): string {
  const s = (scope ?? '').trim()
  if (s) return `Guide scope: ${s} (guide title: "${guideTitle}")`
  return `Guide scope: not tied to a specific country — global / theme-based (guide title: "${guideTitle}")`
}

// ── Per-kind builders ────────────────────────────────────────────────

export type BlockPromptOpts = {
  kind: GuideBlockKind
  heading: string         // the section heading the admin typed
  guideTitle: string
  scope: string | null    // country name OR theme OR null
  notes: string
}

export function buildBlockPrompt(opts: BlockPromptOpts): string {
  switch (opts.kind) {
    case 'intro':       return buildIntroPrompt(opts)
    case 'destination': return buildDestinationPrompt(opts)
    case 'themed':      return buildThemedPrompt(opts)
    case 'closing':     return buildClosingPrompt(opts)
  }
}

function buildIntroPrompt(opts: BlockPromptOpts): string {
  return `${VOICE_AND_RULES}

SECTION HEADING (set by the writer, do NOT repeat it): "${opts.heading}"
KIND: An intro / framing section near the start of the guide. Use the heading literally — don't reinterpret it. If the heading is a "why" question, answer it from lived experience. If it's an "about", introduce. If it's a "what you'll find", describe.

CONTEXT:
${scopeLine(opts.guideTitle, opts.scope)}
Bec and Oli's raw notes: ${joinNotes(opts.notes)}

STRUCTURE:
- Open with one short paragraph that earns the reader's attention without cliché.
- 2–4 sub-sections, each with a short ### heading and 1–3 punchy paragraphs.
- End with a short **HONEST TAKE:** callout ONLY if you have a real opinion to land.
- Do not invent country / activity / price details that aren't in the notes.

${WORD_TARGET(400, 800)}`
}

function buildDestinationPrompt(opts: BlockPromptOpts): string {
  return `${VOICE_AND_RULES}

SECTION HEADING (set by the writer, do NOT repeat it): "${opts.heading}"
KIND: A destination / place chapter. The heading is the destination name.

CONTEXT:
${scopeLine(opts.guideTitle, opts.scope)}
Bec and Oli's raw notes: ${joinNotes(opts.notes)}

STRUCTURE (use these sub-headings, in this order, skip any you genuinely have no info for):
### What it's like
A short, atmospheric paragraph or two. Honest, including what we didn't love.

### Who it's best for
A short bullet list. End with a one-liner like "It's less ideal if you're looking for…" when relevant.

### Where we stayed
Name, type (Airbnb / homestay / hotel), price per night and total, how long we stayed, what we liked, what we didn't love. Keep specific numbers.

### Where to eat
Group as bullet sub-sections: cheap local eats, western/cafés, kid-friendly spots. Include typical prices in local + GBP. Name places.

### Things to do
Each activity gets a ### or **bold** sub-heading with practical details: where, drive time, cost, what to bring, what to expect with kids. Use **PRO TIP:** lines for the small but useful tips.

### Discount codes (only if any are in the notes)
Use **DISCOUNT:** callout lines verbatim from the notes — do not invent.

### Should it be on your itinerary?
A direct yes / no / "as a stopover" answer with one short paragraph of reasoning.

### Our honest take
A **HONEST TAKE:** callout — one or two short paragraphs.

${WORD_TARGET(800, 1500)}`
}

function buildThemedPrompt(opts: BlockPromptOpts): string {
  return `${VOICE_AND_RULES}

SECTION HEADING (set by the writer, do NOT repeat it): "${opts.heading}"
KIND: A themed / cross-cutting chapter. Not tied to a single destination — could be "Choosing the right safari", "How we do worldschooling on the road", "Places to avoid", "Renting a tuk-tuk".

CONTEXT:
${scopeLine(opts.guideTitle, opts.scope)}
Bec and Oli's raw notes: ${joinNotes(opts.notes)}

STRUCTURE:
- Open with a short framing paragraph: why this chapter exists.
- Use ### sub-headings to compare options, list pros/cons, or walk through experiences in chronological order — whatever the topic calls for.
- Use **PRO TIP:**, **AVOID:**, **DISCOUNT:**, and **HONEST TAKE:** callouts where they fit.
- Include exact prices, drive times, etc. where the notes have them.
- End with a short **HONEST TAKE:** if you have a clear opinion.

${WORD_TARGET(500, 1200)}`
}

function buildClosingPrompt(opts: BlockPromptOpts): string {
  return `${VOICE_AND_RULES}

SECTION HEADING (set by the writer, do NOT repeat it): "${opts.heading}"
KIND: The closing chapter of the guide. Reflective, warm, honest. The reader has been through the whole guide; this is the goodbye.

CONTEXT:
${scopeLine(opts.guideTitle, opts.scope)}
Bec and Oli's raw notes / reflections: ${joinNotes(opts.notes)}

STRUCTURE:
- No headings inside this section — just flowing paragraphs.
- Open with one specific observation, not a generic "as we wrap up".
- Be honest about what was hard as well as what was beautiful.
- Mention "you don't have to see everything" / "let the route evolve" / similar real travel wisdom — only if it fits naturally.
- Close with one final small piece of advice and an Instagram sign-off: "If you have found our guide helpful, please let us know, we are @jax.familytravels on Instagram"

${WORD_TARGET(300, 500)}`
}
