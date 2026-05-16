import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { BLOG_WRITER_HTML } from './blog-writer'

export const metadata: Metadata = {
  title: 'Blog Writer',
  robots: { index: false, follow: false },
}

export default function BlogWriterPage() {
  return (
    <div className="pt-16 bg-gray-900">
      <div className="absolute top-16 left-3 z-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-md transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Admin
        </Link>
      </div>
      <iframe
        srcDoc={BLOG_WRITER_HTML}
        title="JFT Blog Writer"
        className="w-full border-0 block"
        style={{ height: 'calc(100vh - 4rem)' }}
      />
    </div>
  )
}
