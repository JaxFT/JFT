import type { Metadata } from 'next'
import ImportForm from './ImportForm'

export const metadata: Metadata = {
  title: 'Admin · Import blog post',
  robots: { index: false, follow: false },
}

export default function ImportPage() {
  return <ImportForm />
}
