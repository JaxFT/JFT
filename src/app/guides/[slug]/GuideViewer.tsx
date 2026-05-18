'use client'

import { useEffect, useState } from 'react'
import { Loader2, ExternalLink, RefreshCw } from 'lucide-react'

type Props = {
  slug: string
  mode: 'preview' | 'full'
  previewPageCount: number
}

// iOS Safari refuses to render PDFs inside iframes inline, you get a
// blank box and the user thinks the page is broken. PDFs DO open
// natively in a fresh tab on iOS, so we always surface an "Open in
// new tab" button alongside the iframe. The iframe path stays for
// desktop browsers that render PDFs inline.
function isLikelyIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return iOS && safari
}

const FETCH_TIMEOUT_MS = 15_000

export default function GuideViewer({ slug, mode, previewPageCount }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [iosSafari, setIosSafari] = useState(false)

  useEffect(() => {
    setIosSafari(isLikelyIosSafari())
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setPdfUrl(null)

    // Time-bound the fetch so a hung worker never leaves the user
    // staring at a spinner forever.
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)

    fetch(`/api/guides/${slug}/url?kind=${mode === 'full' ? 'full' : 'preview'}`, {
      signal: ac.signal,
    })
      .then(async r => {
        const body = await r.json().catch(() => null)
        if (cancelled) return
        if (!r.ok) {
          const detail = body?.bucket && body?.path
            ? `${body.error} (looking for "${body.path}" in bucket "${body.bucket}")`
            : body?.error ?? `HTTP ${r.status}`
          setError(detail)
        } else {
          setPdfUrl(body.url)
        }
      })
      .catch(e => {
        if (cancelled) return
        if (e?.name === 'AbortError') {
          setError('The PDF link took too long to load. Try again, or open in a new tab.')
        } else {
          setError(e instanceof Error ? e.message : String(e))
        }
      })
      .finally(() => {
        clearTimeout(timer)
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true; clearTimeout(timer); ac.abort() }
  }, [slug, mode])

  const heading = mode === 'full' ? 'Full guide' : `Preview, first ${previewPageCount} pages`

  const retry = () => {
    // Re-fire the effect by toggling a key, simplest: just force the
    // browser to refresh state by clearing then setting `loading`.
    setError(null)
    setLoading(true)
    setPdfUrl(null)
    // Defer to next tick to let React unmount the iframe.
    setTimeout(() => {
      fetch(`/api/guides/${slug}/url?kind=${mode === 'full' ? 'full' : 'preview'}`)
        .then(async r => {
          const body = await r.json().catch(() => null)
          if (!r.ok) setError(body?.error ?? `HTTP ${r.status}`)
          else setPdfUrl(body.url)
        })
        .catch(e => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setLoading(false))
    }, 0)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500">{heading}</p>
        <div className="flex items-center gap-3 flex-wrap">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-md"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
            </a>
          )}
          {mode === 'full' && (
            <p className="text-xs text-gray-400 hidden sm:block">On-site reading only</p>
          )}
        </div>
      </div>

      {iosSafari && pdfUrl && (
        <div className="mx-5 mt-5 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 leading-relaxed">
          <strong>iOS Safari tip:</strong> PDFs sometimes don&apos;t render inline on iPad / iPhone. If you see a blank area below, tap <strong>Open in new tab</strong> above to read the guide in your browser.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}

      {error && (
        <div className="p-8 text-center">
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 inline-block px-4 py-2 rounded-lg max-w-lg leading-relaxed">
            Could not load the PDF: {error}
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-md"
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
          </div>
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
