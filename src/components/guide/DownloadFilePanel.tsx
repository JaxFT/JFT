'use client'

// Admin-only panel for refreshing the offline download file. Lives on
// the EditablePreview page where Bec spends most of her editing time.
// One button: click → browser fetches the latest guide → renders the
// full self-contained HTML → uploads to Supabase Storage. Buyers
// stream that file from the download endpoint.

import { useState } from 'react'
import { Download, Loader2, Check, RefreshCw } from 'lucide-react'
import type { GuideRow } from '@/lib/guide-types'
import { generateAndUploadDownload } from '@/lib/admin-guide-pregen'

export default function DownloadFilePanel({ guide }: { guide: GuideRow }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [bytes, setBytes] = useState<number | null>(null)

  const regen = async () => {
    setState('working')
    setError(null)
    try {
      // Fetch the latest guide from the DB so we render exactly what
      // a buyer would see — not whatever stale state the EditPreview
      // page was rendered with.
      const r = await fetch(`/api/admin/guides/${guide.id}`)
      if (!r.ok) throw new Error(`Could not fetch guide (HTTP ${r.status})`)
      const fresh: GuideRow = await r.json()
      await generateAndUploadDownload(fresh)
      setState('done')
      // We don't get exact bytes back, but we can show the user
      // something happened.
      setBytes(null)
      setTimeout(() => setState(s => (s === 'done' ? 'idle' : s)), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Regeneration failed')
      setState('error')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500 inline-flex items-center gap-1.5 mb-1.5">
              <Download className="w-3.5 h-3.5" /> Offline download file
            </p>
            <p className="text-sm text-gray-700">
              Click after any edit so buyers see your latest version when they download.
            </p>
            <p className="text-xs text-gray-500 mt-1.5">
              Built in your browser, saved to storage. Auto-runs on publish.
            </p>
          </div>
          <button
            type="button"
            onClick={regen}
            disabled={state === 'working'}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2.5 rounded-md disabled:opacity-50 shrink-0"
          >
            {state === 'working' && <><Loader2 className="w-4 h-4 animate-spin" /> Building…</>}
            {state === 'done'    && <><Check className="w-4 h-4" /> Saved{bytes ? ` (${Math.round(bytes / 1024)} KB)` : ''}</>}
            {(state === 'idle' || state === 'error') && <><RefreshCw className="w-4 h-4" /> Refresh download file</>}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
        )}
      </div>
    </div>
  )
}
