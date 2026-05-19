import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

// The Family section lives inside /account now (we removed the separate
// Family tab from the navbar). Old bookmarks land on /account instead
// of breaking. The per-child editor (/family/[child_id]) and the
// flight log (/family/flights) are still where they were.

export const metadata: Metadata = { title: 'Family' }
export const dynamic = 'force-dynamic'

export default function FamilyPage() {
  redirect('/account')
}
