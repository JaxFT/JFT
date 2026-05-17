import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Eye, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { getWebGuideById } from '@/lib/guides-content-db'
import { getAboutUs } from '@/lib/app-settings'
import { getAutoLinkPhrases } from '@/lib/blog-links'
import WebGuideView from '@/components/guide/WebGuideView'

export const metadata: Metadata = {
  title: 'Preview · Admin',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminGuidePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Admin gate. Mirror the API route behaviour: respond 404-ish for non-admins.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/admin/guides/${id}/preview`)
  if (!isAdminEmail(user.email)) notFound()

  const guide = await getWebGuideById(id)
  if (!guide) notFound()

  const [aboutUs, autoLinkPhrases] = await Promise.all([
    getAboutUs(),
    getAutoLinkPhrases(),
  ])

  return (
    <div>
      {/* Admin-only preview banner */}
      <div className="sticky top-0 z-20 bg-amber-500 text-amber-950 text-sm font-semibold">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2">
            <Eye className="w-4 h-4" /> Admin preview — {guide.status === 'published' ? 'PUBLISHED' : 'DRAFT'} · full access view
          </span>
          <Link
            href={`/admin/guides/draft?id=${guide.id}`}
            className="inline-flex items-center gap-1.5 bg-amber-950/10 hover:bg-amber-950/20 px-3 py-1 rounded text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to editor
          </Link>
        </div>
      </div>

      <WebGuideView
        guide={guide}
        aboutUsMarkdown={aboutUs}
        autoLinkPhrases={autoLinkPhrases}
        canViewFull={true}
        isLoggedIn={true}
        isPremium={true}
      />
    </div>
  )
}
