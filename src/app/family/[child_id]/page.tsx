import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { getChildById, listChildPackAssignments } from '@/lib/passport-db'
import { PERMISSION_LABELS } from '@/lib/passport-types'
import { PACK_META } from '@/lib/adventurePackData'
import EditProfileSection from './EditProfileSection'
import PermissionSection from './PermissionSection'
import QRSection from './QRSection'
import PackAssignmentSection from './PackAssignmentSection'
import DeleteChildButton from './DeleteChildButton'

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

  const assignments = await listChildPackAssignments(child_id)

  // Strip PACK_META down to the lite shape the assignment section needs
  // — slug, country, flag, status. Everything else stays on the server.
  const allPacks = PACK_META.map(p => ({
    slug: p.slug,
    country: p.country,
    flag: p.flag,
    status: p.status,
  }))

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/family" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> All children
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="text-5xl leading-none">{child.avatar}</div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-1">
              {PERMISSION_LABELS[child.permission_mode]}
            </p>
            <h1 className="text-4xl font-bold text-gray-900">{child.name}</h1>
          </div>
        </div>

        <div className="space-y-5">
          <QRSection
            childId={child.id}
            childName={child.name}
            initialToken={child.qr_token}
          />

          <PackAssignmentSection
            childId={child.id}
            initialAssigned={assignments}
            allPacks={allPacks}
          />

          <EditProfileSection
            childId={child.id}
            initialName={child.name}
            initialAvatar={child.avatar}
          />

          <PermissionSection
            childId={child.id}
            initialMode={child.permission_mode}
            initialAutoApprove={child.stamp_auto_approve}
          />

          <DeleteChildButton
            childId={child.id}
            childName={child.name}
          />
        </div>
      </div>
    </div>
  )
}
