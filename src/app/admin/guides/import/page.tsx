import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import ImportForm from './ImportForm'

export const metadata: Metadata = {
  title: 'New guide · Admin',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function ImportGuidePage() {
  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-6 text-xs font-bold tracking-widest uppercase">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <Link href="/admin" className="text-brand-600 hover:underline">Admin</Link>
          <span className="text-gray-400">/</span>
          <Link href="/admin/guides" className="text-brand-600 hover:underline">Guides</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500">New</span>
        </div>

        <Link href="/admin/guides" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to guides
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">New guide</h1>
          <p className="text-gray-500 mt-2 text-base leading-relaxed">
            Paste the whole guide as one markdown doc. Fill in the cover, title, and tags. We&apos;ll create the draft and drop you on the preview where you can edit text, add photos, and publish.
          </p>
        </div>

        <ImportForm />
      </div>
    </div>
  )
}
