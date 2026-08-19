// "First name + last initial" for anywhere a member's name is shown
// to other members (public profiles, guestbook, recommendations,
// buddy lists, discovery) — same convention Airbnb/Google Reviews use
// for this exact situation (light social + public reviews). Just the
// first character of the surname field, no hyphen-awareness, so
// "Luck-Baker" becomes "L.", matching how those sites behave too.
// Deliberately not applied in admin-facing views, where full names
// are needed for real account identification.
export function shortName(fullName: string | null | undefined): string | null {
  if (!fullName) return null
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return null
  if (parts.length === 1) return parts[0]
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase()
  return `${parts[0]} ${lastInitial}.`
}
