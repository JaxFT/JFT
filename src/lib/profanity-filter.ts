// Blocks a comment outright if it contains a whole word/phrase from
// BLOCKED_WORDS. Whole-word matching only (via \b boundaries) so short
// entries like "ass" don't false-positive inside "class" or
// "assassin" — the classic Scunthorpe problem. Matches are literal,
// not leetspeak-normalised, by design (see blocked-words.ts).

import { BLOCKED_WORDS } from './blocked-words'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Multi-word phrases match on their literal spacing; single words get
// \b...\b boundaries. Built once at module load, not per call.
const PATTERN = new RegExp(
  '\\b(' + BLOCKED_WORDS.map(escapeRegExp).join('|') + ')\\b',
  'i',
)

export function containsBlockedWord(text: string): boolean {
  return PATTERN.test(text)
}
