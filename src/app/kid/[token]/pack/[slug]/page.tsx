import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { getChildByToken } from '@/lib/passport-kid-db'
import { getPackData, getPackMeta } from '@/lib/adventurePackData'
import KidPackShell from '@/components/adventure-packs/KidPackShell'
import FlagBanner from '@/components/adventure-packs/FlagBanner'

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

async function isAssignedToChild(childId: string, slug: string): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return false
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data } = await admin
    .from('child_pack_assignments')
    .select('country_slug')
    .eq('child_id', childId)
    .eq('country_slug', slug)
    .maybeSingle()
  return !!data
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

  const assigned = await isAssignedToChild(child.id, slug)
  if (!assigned) {
    // Friendly "not assigned" screen rather than a hard 404 — helps the
    // parent diagnose if they handed the kid a URL for a pack they
    // forgot to assign.
    return (
      <div className="min-h-screen bg-sand-50 pt-20 pb-20">
        <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
          <Link href={`/kid/${token}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to my passport
          </Link>
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
