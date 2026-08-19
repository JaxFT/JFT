import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// A flat public directory of every traveller's profile doesn't fit
// the product at this stage — buddies are meant to be people you
// already know (added by name/username search, soon by invite link),
// not strangers browsed off a list. Redirecting rather than deleting
// the route: reversible, and anyone with an old link/bookmark still
// lands somewhere useful instead of a 404. The original directory
// implementation (search, card grid) is preserved in git history if
// this ever gets revisited once there's enough activity for a
// directory to feel populated rather than empty.
export default function DiscoverPage() {
  redirect('/travel-profile')
}
