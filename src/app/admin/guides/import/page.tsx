import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import ImportForm from './ImportForm'

export const metadata: Metadata = {
  title: 'Import guide · Admin',
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
          <span className="text-gray-500">Import</span>
        </div>

        <Link href="/admin/guides" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to guides
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import a guide</h1>
          <p className="text-gray-500 mt-2 text-base leading-relaxed">
            Paste a guide you&apos;ve written in Claude or anywhere else. We split the markdown on every <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">##</code> heading into a section, auto-classify each section&apos;s kind, and drop you into the wizard to review and publish.
          </p>
        </div>

        <ImportForm />
      </div>
    </div>
  )
}
