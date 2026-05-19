import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  getChildByToken,
  getKidStats,
  listAwardedStampsForChild,
  listCountryVisitsForChild,
  listAssignedPacksForChild,
} from '@/lib/passport-kid-db'
import { listJournalEntriesForChild } from '@/lib/passport-journal-db'
import KidShell from './KidShell'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const child = await getChildByToken(token)
  if (!child) return { title: 'Passport' }
  return {
    title: `${child.name}'s Passport`,
    // Don't index a kid's URL — these are bearer-token pages.
    robots: { index: false, follow: false },
  }
}

export default async function KidLandingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const child = await getChildByToken(token)
  if (!child) notFound()

  const [stats, stamps, visits, assignedPacks, journal] = await Promise.all([
    getKidStats(child.id),
    listAwardedStampsForChild(child.id),
    listCountryVisitsForChild(child.id),
    listAssignedPacksForChild(child.id),
    listJournalEntriesForChild(child.id),
  ])

  return (
    <KidShell
      token={token}
      child={{
        id: child.id,
        name: child.name,
        avatar: child.avatar,
        permission_mode: child.permission_mode,
        home_country_slug: child.home_country_slug,
      }}
      stats={stats}
      stamps={stamps}
      visits={visits}
      assignedPacks={assignedPacks}
      journal={journal}
    />
  )
}
