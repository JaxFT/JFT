import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient as createSbClient } from '@supabase/supabase-js'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { getPublicProfilesByIds } from '@/lib/travel-profile-db'
import ModerationList, { type ModerationRow } from './ModerationList'
import { requireAdminPage } from '@/lib/admin-page'

export const metadata: Metadata = {
  title: 'Admin · Moderation',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function adminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// moderation_items has no client-facing RLS policies at all, this
// page is the only place it's ever read, always via the service role.
export default async function AdminModerationPage() {
  await requireAdminPage()
  const admin = adminClient()
  const { data: rows } = await admin
    .from('moderation_items')
    .select('id, content_type, author_user_id, body_snapshot, context_label, context_link, flagged, flagged_at, created_at')
    .is('reviewed_at', null)
    .order('flagged', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  const allRows = rows ?? []
  const authors = await getPublicProfilesByIds([...new Set(allRows.map(r => r.author_user_id).filter((id): id is string => !!id))])
  const items: ModerationRow[] = allRows.map(r => ({
    ...r,
    author: r.author_user_id ? authors.get(r.author_user_id) ?? null : null,
  }))

  const flaggedCount = items.filter(i => i.flagged).length

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Admin</Link>
          <span className="text-xs text-gray-400">/</span>
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Moderation</p>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-7 h-7 text-brand-600" />
          <h1 className="text-3xl font-bold text-gray-900">Moderation</h1>
        </div>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Every new blog comment, guide comment, recommendation comment, and guestbook message lands here, whichever comes first.{' '}
          {flaggedCount > 0 && <span className="font-semibold text-red-700">{flaggedCount} flagged by a page owner.</span>}{' '}
          Click &quot;Actioned&quot; once you&apos;ve reviewed something, it drops off this list for good.
        </p>

        <ModerationList initialItems={items} />
      </div>
    </div>
  )
}
