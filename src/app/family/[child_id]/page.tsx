import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import { getChildById } from '@/lib/passport-db'

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

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/family" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> All children
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="text-5xl leading-none">{child.avatar}</div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-1">Child profile</p>
            <h1 className="text-4xl font-bold text-gray-900">{child.name}</h1>
          </div>
        </div>

        {/* Placeholder. The full management UI (rename, avatar, permission
            toggle, QR code, pack assignment, stamp history, journal review)
            lands in the next phase of the build. */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-gray-500">
          <p className="font-semibold text-gray-900 mb-2">More controls coming next</p>
          <p>
            QR code, pack assignment, permission tweaks, manual stamp award, journal review — all of that lands in the next phase.
            For now this page just confirms the child was created and is owned by you.
          </p>
        </div>
      </div>
    </div>
  )
}
