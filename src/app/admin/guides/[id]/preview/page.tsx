import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { getWebGuideById } from '@/lib/guides-content-db'
import { getAboutUs } from '@/lib/app-settings'
import { getAutoLinkPhrases } from '@/lib/blog-links-server'
import EditablePreview from '@/components/guide/EditablePreview'

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

  const [guide, aboutUs, autoLinkPhrases] = await Promise.all([
    getWebGuideById(id),
    getAboutUs(),
    getAutoLinkPhrases(),
  ])
  if (!guide) notFound()

  return (
    <EditablePreview
      guide={guide}
      aboutUsMarkdown={aboutUs}
      autoLinkPhrases={autoLinkPhrases}
    />
  )
}
