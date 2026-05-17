import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getWebGuideById } from '@/lib/guides-content-db'

export const metadata: Metadata = {
  title: 'Edit guide · Admin',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function EditGuidePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const guide = await getWebGuideById(id)
  if (!guide) notFound()
  // Same wizard, loaded with the existing draft. The wizard supports
  // navigating to any step, saving per-section, and publishing.
  redirect(`/admin/guides/draft?id=${id}`)
}
