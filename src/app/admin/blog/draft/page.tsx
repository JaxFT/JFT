import type { Metadata } from 'next'
import Wizard from './Wizard'

export const metadata: Metadata = {
  title: 'Admin · New blog post',
  robots: { index: false, follow: false },
}

export default function NewDraftPage() {
  return <Wizard />
}
