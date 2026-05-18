import Link from 'next/link'
import { ShieldCheck, Link2 } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import LinksForm from './LinksForm'

export const metadata: Metadata = {
  title: 'Admin · Auto-links',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type LinkRow = { id: string; phrase: string; url: string; note: string | null }

export default async function AdminBlogLinksPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('blog_auto_links')
    .select('id, phrase, url, note')
    .order('phrase', { ascending: true })

  const links: LinkRow[] = (rows ?? []) as LinkRow[]

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Admin</Link>
          <span className="text-xs text-gray-400">/</span>
          <Link href="/admin/blog" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Blog</Link>
          <span className="text-xs text-gray-400">/</span>
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Auto-links</p>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <Link2 className="w-7 h-7 text-brand-600" />
          <h1 className="text-3xl font-bold text-gray-900">Auto-links</h1>
        </div>
        <p className="text-gray-500 mb-8 leading-relaxed">
          When a published post mentions one of these phrases, the FIRST occurrence in the body becomes a clickable link to the URL you set. Tags from existing posts are already auto-linked to their <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/blog?tag=…</code> filter, entries here override or add to that.
        </p>

        <LinksForm initialLinks={links} />
      </div>
    </div>
  )
}
