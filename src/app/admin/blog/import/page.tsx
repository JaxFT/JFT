import type { Metadata } from 'next'
import ImportForm from './ImportForm'
import { requireAdminPage } from '@/lib/admin-page'

export const metadata: Metadata = {
  title: 'Admin · Import blog post',
  robots: { index: false, follow: false },
}

export default async function ImportPage() {
  await requireAdminPage()
  return <ImportForm />
}
