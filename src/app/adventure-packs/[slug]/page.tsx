import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Crown, Lock, ArrowRight, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { checkAdventurePackAccess } from '@/lib/adventure-pack-access'
import { getPackData, getPackMeta } from '@/lib/adventurePackData'
import PackShell from '@/components/adventure-packs/PackShell'
import FlagBanner from '@/components/adventure-packs/FlagBanner'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const meta = getPackMeta(slug)
  if (!meta) return {}
  return {
    title: `${meta.country} Adventure Pack`,
    description: `Nine missions for families exploring ${meta.country}: language, food, geography, history, scavenger hunts and family chat.`,
  }
}

export default async function AdventurePackPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const meta = getPackMeta(slug)
  if (!meta) notFound()

  // Content not yet authored.
  if (meta.status !== 'live') {
    return (
      <div className="min-h-screen bg-sand-50 pt-24 pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <Link href="/adventure-packs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> All adventure packs
          </Link>
          <FlagBanner
            iso2={meta.iso2}
            country={meta.country}
            fallbackColour={meta.heroColour}
            size="md"
            rounded
            as="h1"
          />
          <p className="text-gray-500 mt-6 leading-relaxed">
            We&apos;re still writing this one. We&apos;re shipping new country packs every few weeks. Check back soon, or start with the France pack which is free for every member.
          </p>
          <Link href="/adventure-packs" className="btn-primary mt-6 inline-flex justify-center !py-2 !px-5 !text-sm">
            Browse all packs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  // Access gate.
  const access = await checkAdventurePackAccess(slug)

  if (access.kind === 'login') {
    redirect(`/login?next=/adventure-packs/${slug}`)
  }

  if (access.kind === 'locked') {
    return (
      <div className="min-h-screen bg-sand-50 pt-24 pb-20">
        <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
          <Link href="/adventure-packs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> All adventure packs
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
            <h2 className="text-xl font-bold text-gray-900 mb-2">This pack is for Premium members</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              France is free for every member. All other country packs are included with Premium: £25 a year for everything on the site.
            </p>
            <Link href="/account" className="btn-primary w-full justify-center !py-2.5 !text-sm">
              <Crown className="w-4 h-4" /> Upgrade to Premium <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // access.kind === 'allow'
  const data = getPackData(slug)
  if (!data) notFound()

  // Need the user id for the client hook
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/adventure-packs/${slug}`)

  return <PackShell userId={user.id} data={data} />
}
