'use client'

// Route-level error boundary. Catches errors thrown inside the app
// shell (anything below the root layout). Two main jobs:
//   1. Auto-reload on stale-chunk errors after a deploy (the user got
//      old HTML pointing at JS chunks that no longer exist).
//   2. Show a friendly fallback for anything else, with reset + reload
//      + back-to-home so the user is never stuck on a broken screen.

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'

// Patterns that mean "the JS bundle the page expected is gone" —
// almost always a stale-deployment problem rather than a real bug.
function isChunkLoadError(err: { name?: string; message?: string }): boolean {
  const s = `${err?.name ?? ''} ${err?.message ?? ''}`
  return /ChunkLoadError|Loading chunk \d+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(s)
}

// Avoid an infinite reload loop if the chunk error is genuine and
// repeats. We only auto-reload at most once every 30 seconds per tab.
const RELOAD_FLAG_KEY = 'jft_chunk_reload_at'
const RELOAD_COOLDOWN_MS = 30_000

function shouldAutoReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG_KEY) ?? 0)
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false
    sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()))
    return true
  } catch {
    return true
  }
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (isChunkLoadError(error) && shouldAutoReload()) {
      window.location.reload()
    }
  }, [error])

  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">Something went wrong</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">That didn&apos;t load properly</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Usually a refresh sorts it. If you keep hitting this, let us know.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => { try { sessionStorage.removeItem(RELOAD_FLAG_KEY) } catch {} ; reset() }}
            className="btn-primary justify-center !py-2.5 !px-5 !text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-700 px-5 py-2.5 rounded-md border border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
        {error?.digest && (
          <p className="text-xs text-gray-400 mt-6 font-mono">ref: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
