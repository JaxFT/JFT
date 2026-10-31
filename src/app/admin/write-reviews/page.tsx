import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ShieldCheck, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import WriteReviewsList, { type WriteReviewRow } from './WriteReviewsList'
import { requireAdminPage } from '@/lib/admin-page'

export const metadata: Metadata = {
  title: 'Admin · Write Google reviews',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Deliberately scoped to the signed-in admin's OWN recommendations —
// each admin writes their own Google reviews under their own Google
// account, there's no shared "write on Bec's behalf" concept here.
export default async function WriteReviewsPage() {
  await requireAdminPage()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/write-reviews')

  const { data: rows } = await supabase
    .from('recommendations')
    .select('id, category, place_name, iso2, town, rating, note, google_maps_url, google_review_posted_at')
    .eq('user_id', user.id)
    .not('google_maps_url', 'is', null)
    .order('created_at', { ascending: true })

  const items: WriteReviewRow[] = (rows ?? []) as WriteReviewRow[]
  const doneCount = items.filter(i => i.google_review_posted_at).length

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Admin</Link>
          <span className="text-xs text-gray-400">/</span>
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Write Google reviews</p>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <Star className="w-7 h-7 text-brand-600" />
          <h1 className="text-3xl font-bold text-gray-900">Write Google reviews</h1>
        </div>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Your own recommendations that have a Maps link, {doneCount}/{items.length} marked done. &quot;Write on Google&quot; jumps straight to that
          place&apos;s review box on Google, signed in as you, there&apos;s no way to post automatically, Google doesn&apos;t allow that. Copy your note
          first if you want a head start on the wording.
        </p>

        <WriteReviewsList initialItems={items} />
      </div>
    </div>
  )
}
