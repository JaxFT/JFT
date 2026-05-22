import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { getChildById } from '@/lib/passport-db'
import { listJournalEntriesForChildParent } from '@/lib/passport-journal-db'
import { PERMISSION_LABELS } from '@/lib/passport-types'
import { PACK_META } from '@/lib/adventurePackMeta'
import EditProfileSection from './EditProfileSection'
import PermissionSection from './PermissionSection'
import QRSection from './QRSection'
import JournalSection from './JournalSection'
// Pack assignment, country visits, stamps management, home country
// and delete-passport all moved to /account as family-level sections.

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ child_id: string }>
}): Promise<Metadata> {
  const { child_id } = await params
  const child = await getChildById(child_id)
  if (!child) return { title: 'Family' }
  return { title: `${child.name} — Family` }
}

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ child_id: string }>
}) {
  const { child_id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/family/${child_id}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle()
  if (!isPremiumTier(profile?.subscription_tier)) redirect('/family')

  const child = await getChildById(child_id)
  if (!child) notFound()

  const journal = await listJournalEntriesForChildParent(child_id)

  // Strip PACK_META down to the lite shape Journal needs.
  const journalPacks = PACK_META.map(p => ({ slug: p.slug, country: p.country, flag: p.flag }))

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/family" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> All children
        </Link>

        <div className="mb-8 flex items-center gap-4 flex-wrap">
          <div className="text-5xl leading-none">{child.avatar}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-1">
              {PERMISSION_LABELS[child.permission_mode]}
            </p>
            <h1 className="text-4xl font-bold text-gray-900">{child.name}</h1>
          </div>
          <a
            href={`/kid/${child.qr_token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-md shrink-0"
            title={`Opens ${child.name}'s passport in a new tab — fully functional, not read-only`}
          >
            Open {child.name}&apos;s passport <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <p className="text-sm text-gray-500 -mt-4 mb-2">
          New here?{' '}
          <Link href="/passports/stamps" className="font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2">
            Read how stamps work
          </Link>{' '}
          for ideas on awarding them and setting challenges.
        </p>

        <div className="space-y-5">
          <QRSection
            childId={child.id}
            childName={child.name}
            initialToken={child.qr_token}
          />

          <EditProfileSection
            childId={child.id}
            initialName={child.name}
            initialAvatar={child.avatar}
            initialAgeMode={child.age_mode}
          />

          <JournalSection
            childId={child.id}
            initialEntries={journal}
            allPacks={journalPacks}
          />

          <PermissionSection
            childId={child.id}
            initialMode={child.permission_mode}
            initialAutoApprove={child.stamp_auto_approve}
          />
        </div>
      </div>
    </div>
  )
}
