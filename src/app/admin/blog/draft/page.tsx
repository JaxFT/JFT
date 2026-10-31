import type { Metadata } from 'next'
import Wizard from './Wizard'
import { requireAdminPage } from '@/lib/admin-page'

export const metadata: Metadata = {
  title: 'Admin · New blog post',
  robots: { index: false, follow: false },
}

export default async function NewDraftPage() {
  await requireAdminPage()
  return <Wizard />
}
