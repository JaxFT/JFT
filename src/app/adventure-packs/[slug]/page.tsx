import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowRight, ArrowLeft, Crown, Check } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { checkAdventurePackAccess } from '@/lib/adventure-pack-access'
import { getPackData, getPackMeta } from '@/lib/adventurePackData'
import UserPackShell from '@/components/adventure-packs/UserPackShell'
import FlagBanner from '@/components/adventure-packs/FlagBanner'
import UpgradeButton from '@/components/billing/UpgradeButton'
import BuyPackButton from '@/components/adventure-packs/BuyPackButton'

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
          {/* Two stacked CTAs: buy this one pack for £4.99, or upgrade
              to Premium for everything. Premium card is laid out as the
              recommended path (Crown, brand-dark background) without
              hiding the one-off, so price-sensitive visitors still see
              the £4.99 option clearly. */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left">
              <Lock className="w-6 h-6 text-brand-600 mb-3" />
              <h2 className="text-lg font-bold text-gray-900 mb-1">{meta.country} Adventure Pack</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Nine missions for families exploring {meta.country}, yours to keep. One-off purchase, no subscription.
              </p>
              <BuyPackButton slug={slug} />
            </div>

            <div className="bg-brand-950 text-white rounded-2xl p-6 text-left">
              <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-2 inline-flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Or get everything with Premium
              </p>
              <h3 className="text-lg font-bold mb-3 leading-tight">£49.99 a year for the whole site.</h3>
              <ul className="space-y-1.5 text-sm text-white/85 mb-5">
                {[
                  'Every Adventure Pack, in every country we have',
                  'Family Passports for every child, with stamps as they complete missions',
                  'Every guide and every premium blog post',
                ].map(line => (
                  <li key={line} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-brand-300 mt-1 shrink-0" strokeWidth={3} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <UpgradeButton
                className="bg-white !text-brand-900 hover:bg-gray-100 font-bold inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md text-sm"
                withCrown
                label="Go Premium"
              />
            </div>
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

  return <UserPackShell userId={user.id} data={data} />
}
