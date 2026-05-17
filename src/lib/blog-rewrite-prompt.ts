// Builds the AI prompt for rewriting an existing blog post to a new
// target read time. The user pastes the prompt into their trained
// Claude Project (or Claude.ai / ChatGPT), then pastes the response
// back into the editor.
//
// Two possible response shapes are explicitly supported:
//   1. The new body markdown (in a triple-backtick block).
//   2. A "QUESTIONS:" list when the AI can't faithfully extend without
//      more lived-experience detail. The user then answers the questions
//      and regenerates.

import { VOICE_PROFILE } from '@/lib/voice-profile'
import type { BlogLink } from '@/lib/blog-db'

const WORDS_PER_MIN = 200

function wordRange(min: number): { lo: number; hi: number; cap: number } {
  const safeMin = Math.max(1, Math.min(20, Math.round(min)))
  const hi = safeMin * WORDS_PER_MIN
  const lo = Math.max(120, hi - Math.round(WORDS_PER_MIN * 0.4))
  const cap = Math.round(hi * 1.15)
  return { lo, hi, cap }
}

export type RewritePromptInput = {
  title: string
  excerpt: string | null
  category: string | null
  placeName: string | null
  location: string | null
  tripDate: string | null         // yyyy-mm-dd
  links: BlogLink[]
  currentBody: string             // current markdown body
  currentMinutes: number          // existing actual read time (from word count)
  targetMinutes: number           // new desired read time
  additionalNotes: string         // optional extra info from the writer
}

function formatTripDate(d: string | null): string {
  if (!d) return 'not specified'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
}

export function buildRewritePrompt(input: RewritePromptInput): string {
  const wantsLonger = input.targetMinutes > input.currentMinutes
  const wantsShorter = input.targetMinutes < input.currentMinutes
  const { lo, hi, cap } = wordRange(input.targetMinutes)

  const linkLines = input.links.length === 0
    ? 'LINKS: none'
    : input.links
        .map((l, i) => `  ${i + 1}. ${l.url}  (purpose: ${l.label})`)
        .join('\n')

  const direction = wantsLonger
    ? `EXPAND the post to roughly ${input.targetMinutes} minutes (currently ~${input.currentMinutes} min). Add depth, specific moments, sensory detail, practical info — NOT padding. Every new sentence must add something a reader would actually want.`
    : wantsShorter
    ? `SHORTEN the post to roughly ${input.targetMinutes} minutes (currently ~${input.currentMinutes} min). Cut the weakest sentences and least-essential sections first. Keep the strongest, most specific moments. Do not lose any factual detail (prices, names, places) — only narrative fat.`
    : `REWRITE the post at roughly ${input.targetMinutes} minutes (same as now). Improve the writing without changing the length materially.`

  return `${VOICE_PROFILE}

TASK: Rewrite an existing JaxFamilyTravels.com blog post.

${direction}

LENGTH — STRICT CAP, NOT A GOAL:
Target: about ${input.targetMinutes} minute read (~${lo}–${hi} words at normal reading speed).
HARD CEILING: ${cap} words. Going over is a failure.
Forbidden waffle: generic atmospheric scene-setting, "what we learned" reflections, restating points in different words, sentences that exist only to introduce the next sentence.

POST CONTEXT (do NOT invent facts beyond these and the existing body):
Title: ${input.title}
${input.excerpt ? `Excerpt: ${input.excerpt}` : ''}
Type: ${input.category ?? 'not set'}
Location: ${input.location ?? 'not set'}
Place name: ${input.placeName ?? 'not set'}
When we visited: ${formatTripDate(input.tripDate)}

${linkLines}

PRESERVATION RULES — IMPORTANT:
- Keep ALL markdown image syntax \`![caption](URL)\` exactly as in the existing body. Do not remove photos.
- Keep ALL existing markdown links \`[text](URL)\`. You may reword the surrounding sentence but the link target must survive.
- Keep the same overall topic and stance. If the existing post said somewhere was overrated, the rewrite says so too.
- Do not change British English spellings, place names, prices, or specific factual numbers from the existing body.

${input.additionalNotes.trim()
  ? `ADDITIONAL NOTES FROM THE WRITER (use these to add new content authentically):
${input.additionalNotes.trim()}`
  : 'ADDITIONAL NOTES FROM THE WRITER: none — work only from the existing body.'}

${wantsLonger
  ? `IF YOU CANNOT EXPAND HONESTLY: do NOT pad. If the existing body and notes do not give you enough real material to reach ${input.targetMinutes} minutes without fabricating, STOP and respond with ONLY a list of specific questions the writer needs to answer. Format that response exactly as:

QUESTIONS:
1. <short specific question>
2. <short specific question>
3. <short specific question>

No more than 6 questions. Each question must be specific (e.g. "What did you order at Heng Huat besides char kway teow?" not "What else happened?"). Do NOT return any post body in this case.`
  : ''}

EXISTING POST BODY (rewrite this — keep ALL images and links):

${input.currentBody}

OUTPUT FORMAT — IMPORTANT:
If you have enough material, return the rewritten body WRAPPED IN A SINGLE TRIPLE-BACKTICK CODE BLOCK so it's easy to copy. Markdown only, no frontmatter. Like this:

\`\`\`
<rewritten body in markdown>
\`\`\`

Do NOT add any text before or after the code block.
${wantsLonger ? 'OR, if you cannot expand honestly, return the QUESTIONS list described above instead (plain text, no code block).' : ''}`
}
