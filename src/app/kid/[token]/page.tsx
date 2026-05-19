import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  getChildByToken,
  getKidStats,
  listAwardedStampsForChild,
  listCountryVisitsForChild,
} from '@/lib/passport-kid-db'
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

  const [stats, stamps, visits] = await Promise.all([
    getKidStats(child.id),
    listAwardedStampsForChild(child.id),
    listCountryVisitsForChild(child.id),
  ])

  return (
    <KidShell
      child={{
        id: child.id,
        name: child.name,
        avatar: child.avatar,
        permission_mode: child.permission_mode,
      }}
      stats={stats}
      stamps={stamps}
      visits={visits}
    />
  )
}
