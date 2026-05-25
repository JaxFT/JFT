// Normalise a person's name to title case so "john smith" becomes
// "John Smith" regardless of how the user typed it. Used on signup,
// the account editor, and the server-side ensure-profile path so a
// name written once in lowercase doesn't show up that way forever.
//
// Handles:
//   - "john smith"   → "John Smith"
//   - "  JANE  SMITH" → "Jane Smith"   (collapses whitespace, trims)
//   - "jean-paul"    → "Jean-Paul"     (hyphens preserved)
//   - "o'brien"      → "O'Brien"       (caps after apostrophe)
//   - "ÉLÉONORE"     → "Éléonore"      (accented chars handled)
//
// NOT handled: prefixes like "Mc"/"Mac" (returns "Mcdonald"), Dutch
// "van"/"de" (returns "Van Der Berg"), suffixes like "II"/"III"
// (returns "Ii"). Those are rare enough that a user can correct them
// by hand after the auto-format runs.
export function titleCaseName(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|[\s\-'])(\p{L})/gu, (_, sep, ch: string) => sep + ch.toUpperCase())
}
