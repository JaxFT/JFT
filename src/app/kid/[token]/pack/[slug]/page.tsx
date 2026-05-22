import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { getChildByToken } from '@/lib/passport-kid-db'
import { getPackData, getPackMeta } from '@/lib/adventurePackData'
import KidPackShell from '@/components/adventure-packs/KidPackShell'
import FlagBanner from '@/components/adventure-packs/FlagBanner'
import KidBackButton from '@/components/passport/KidBackButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string; slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const meta = getPackMeta(slug)
  return {
    title: meta ? `${meta.country} Adventure Pack` : 'Adventure Pack',
    robots: { index: false, follow: false },
  }
}

// A pack is available to the kid if either (a) the parent explicitly
// assigned it OR (b) the family has visited the country, even if the
// pack didn't exist at the time of the visit.
async function isAssignedToChild(childId: string, parentId: string | null, slug: string): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return false
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data: assignment } = await admin
    .from('child_pack_assignments')
    .select('country_slug')
    .eq('child_id', childId)
    .eq('country_slug', slug)
    .maybeSingle()
  if (assignment) return true

  const meta = getPackMeta(slug)
  if (!meta || !parentId) return false
  const { data: visit } = await admin
    .from('family_country_visits')
    .select('iso2')
    .eq('parent_id', parentId)
    .eq('iso2', meta.iso2)
    .maybeSingle()
  return !!visit
}

export default async function KidPackPage({
  params,
}: {
  params: Promise<{ token: string; slug: string }>
}) {
  const { token, slug } = await params

  const meta = getPackMeta(slug)
  if (!meta) notFound()

  const child = await getChildByToken(token)
  if (!child) notFound()

  const assigned = await isAssignedToChild(child.id, child.parent_id, slug)
  if (!assigned) {
    // Friendly "not assigned" screen rather than a hard 404 — helps the
    // parent diagnose if they handed the kid a URL for a pack they
    // forgot to assign.
    return (
      <div className="min-h-screen bg-sand-50 pt-20 pb-20">
        <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
          <div className="mb-6">
            <KidBackButton fallbackHref={`/kid/${token}`} label="Back" variant="onPaper" />
          </div>
          <FlagBanner
            iso2={meta.iso2}
            country={meta.country}
            fallbackColour={meta.heroColour}
            size="md"
            rounded
            className="mb-6"
            as="h1"
          />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <Lock className="w-7 h-7 text-brand-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Not in your passport yet</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Ask a grown-up to add the {meta.country} pack from the Family page.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const data = getPackData(slug)
  if (!data) notFound()

  return <KidPackShell token={token} data={data} />
}
