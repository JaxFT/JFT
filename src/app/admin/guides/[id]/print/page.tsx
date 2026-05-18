import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { getWebGuideById } from '@/lib/guides-content-db'
import PrintView from '@/components/guide/PrintView'

export const metadata: Metadata = {
  title: 'Print · Admin',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Admin-only print-friendly render of a guide. Has no site chrome
// (navbar + footer use print:hidden universally). Auto-fires the
// print dialog on load so the writer just picks "Save as PDF" and
// gets the file. The result then gets uploaded back via the preview
// banner so it can be sold as a download later.
export default async function AdminPrintGuidePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/admin/guides/${id}/print`)
  if (!isAdminEmail(user.email)) notFound()

  const guide = await getWebGuideById(id)
  if (!guide) notFound()

  return <PrintView guide={guide} />
}
