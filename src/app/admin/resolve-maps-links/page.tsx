import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ResolveList, { type ResolveRow } from './ResolveList'
import { requireAdminPage } from '@/lib/admin-page'

export const metadata: Metadata = {
  title: 'Admin · Resolve Maps links',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Recommendations are public-select, so the normal cookie client sees
// all of them, no service role needed to read. Writes go through the
// existing owner-scoped PATCH /api/recommendations, so this only
// works for recommendations the signed-in admin themselves own —
// fine, that's the actual use case (bulk-imported rows on your own
// account).
export default async function ResolveMapsLinksPage() {
  await requireAdminPage()
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('recommendations')
    .select('id, category, place_name, iso2, town, date_visited, rating, note, google_maps_url')
    .is('google_maps_url', null)
    .order('created_at', { ascending: true })

  const items: ResolveRow[] = (rows ?? []) as ResolveRow[]

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Admin</Link>
          <span className="text-xs text-gray-400">/</span>
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Resolve Maps links</p>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-7 h-7 text-brand-600" />
          <h1 className="text-3xl font-bold text-gray-900">Resolve Maps links</h1>
        </div>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Every recommendation of yours without a Google Maps link, {items.length} right now. Click &quot;Start&quot; and it&apos;ll search
          each one automatically (throttled, so it won&apos;t trip the daily quota), pick the right match or search manually if it's wrong,
          skip anything you can't find, same as leaving it blank.
        </p>

        <ResolveList initialItems={items} />
      </div>
    </div>
  )
}
