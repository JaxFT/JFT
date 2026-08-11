'use client'

// /api/guides/[slug]/url?kind=download returns a signed Supabase
// Storage URL as JSON (never streams the file directly, unlike the
// web-guide download route), so a plain <a href> pointing at it just
// navigates to a page showing raw JSON — this fetches the URL first,
// then redirects the browser to the real signed file link.
//
// Accepts an optional sessionId for the guest-checkout path (fresh
// from Stripe, no sign-in needed, verified server-side).

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export default function DownloadPdfButton({
  slug, sessionId, label = 'Download',
}: {
  slug: string
  sessionId?: string
  label?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ kind: 'download', ...(sessionId ? { session_id: sessionId } : {}) })
      const res = await fetch(`/api/guides/${slug}/url?${qs.toString()}`)
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.url) throw new Error(body.error || 'Could not get download link')
      window.location.href = body.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={download}
        disabled={loading}
        className="btn-primary !py-2.5 !px-5 !text-sm shrink-0 disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {label}
      </button>
      {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
    </div>
  )
}
