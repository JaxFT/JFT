import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { getWebGuideById } from '@/lib/guides-content-db'
import PdfBuilder from './PdfBuilder'

export const metadata: Metadata = {
  title: 'PDF Builder · Admin',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminPdfBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/admin/guides/${id}/pdf-builder`)
  if (!isAdminEmail(user.email)) notFound()

  const guide = await getWebGuideById(id)
  if (!guide) notFound()

  // Prefer the single-doc body_markdown; if the guide is still block-
  // based, stitch the blocks into a single markdown string so the
  // builder works with both shapes.
  const initialMarkdown = guide.body_markdown.trim()
    ? guide.body_markdown
    : (guide.sections.blocks ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(b => {
          const heading = b.heading.trim()
          const body = b.body.trim()
          return heading ? `## ${heading}\n\n${body}` : body
        })
        .join('\n\n')

  return (
    <PdfBuilder
      guideId={guide.id}
      title={guide.title}
      subtitle={guide.subtitle}
      coverImage={guide.cover_image}
      tags={guide.tags}
      initialMarkdown={initialMarkdown}
    />
  )
}
