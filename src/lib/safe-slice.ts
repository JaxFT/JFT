// Truncates a string to at most `max` visible characters (grapheme
// clusters), not UTF-16 code units. Plain `.slice(0, n)` can cut a
// multi-code-point emoji in half, e.g. a flag is two "regional
// indicator" code points that must stay paired, corrupting it into an
// invalid character that then fails to save with no useful error.
// Falls back to code-point-safe splitting if Intl.Segmenter isn't
// available.
export function safeSlice(input: string, max: number): string {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    const graphemes = Array.from(segmenter.segment(input), s => s.segment)
    return graphemes.slice(0, max).join('')
  }
  return Array.from(input).slice(0, max).join('')
}
