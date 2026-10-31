import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getWebGuideById } from '@/lib/guides-content-db'
import Wizard from './Wizard'
import { requireAdminPage } from '@/lib/admin-page'

export const metadata: Metadata = {
  title: 'New guide · Admin',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function GuideDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  await requireAdminPage()
  const { id } = await searchParams
  if (!id) {
    // The wizard requires an existing draft row. Push admin back to the
    // list, which has the "New guide" CTA that creates one and redirects.
    redirect('/admin/guides')
  }
  const guide = await getWebGuideById(id)
  if (!guide) notFound()

  return <Wizard guide={guide} />
}
