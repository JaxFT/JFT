'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

type Props = {
  slug: string
  mode: 'preview' | 'full'
  previewPageCount: number
}

export default function GuideViewer({ slug, mode, previewPageCount }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setPdfUrl(null)

    fetch(`/api/guides/${slug}/url?kind=${mode === 'full' ? 'full' : 'preview'}`)
      .then(async r => {
        const body = await r.json().catch(() => null)
        if (cancelled) return
        if (!r.ok) {
          setError(body?.error ?? `HTTP ${r.status}`)
        } else {
          setPdfUrl(body.url)
        }
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [slug, mode])

  const heading = mode === 'full' ? 'Full guide' : `Preview — first ${previewPageCount} pages`

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500">{heading}</p>
        {mode === 'full' && (
          <p className="text-xs text-gray-400">Disable downloads is best-effort — on-site reading only</p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}

      {error && (
        <div className="p-8 text-center">
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 inline-block px-4 py-2 rounded-lg">
            Could not load the PDF: {error}
          </p>
        </div>
      )}

      {!loading && !error && pdfUrl && (
        <iframe
          src={pdfUrl + '#toolbar=' + (mode === 'full' ? '0' : '1')}
          title={mode === 'full' ? 'Full guide' : 'Guide preview'}
          className="w-full block border-0"
          style={{ height: '80vh' }}
        />
      )}
    </div>
  )
}
