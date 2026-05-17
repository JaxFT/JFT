'use client'

// Last-resort error boundary. Catches errors that happen inside the
// root layout itself (where app/error.tsx wouldn't even render). Must
// render its own <html>/<body> because the layout never mounted.
//
// Same chunk-reload behaviour as app/error.tsx — if the user has stale
// HTML after a deploy, silently grab the fresh bundle.

import { useEffect } from 'react'

function isChunkLoadError(err: { name?: string; message?: string }): boolean {
  const s = `${err?.name ?? ''} ${err?.message ?? ''}`
  return /ChunkLoadError|Loading chunk \d+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(s)
}

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

export default function GlobalError({
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
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        background: '#F5F4F1',
        color: '#1A1A18',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          maxWidth: 420,
          width: '100%',
          background: 'white',
          borderRadius: 16,
          border: '1px solid #f3f4f6',
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#2d6b4f', margin: 0, marginBottom: 12 }}>
            Something went wrong
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, marginBottom: 12 }}>
            We hit a snag loading that
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: 0, marginBottom: 24 }}>
            Usually a refresh sorts it. If it keeps happening, let us know.
          </p>
          <button
            onClick={() => { try { sessionStorage.removeItem(RELOAD_FLAG_KEY) } catch {} ; reset() }}
            style={{
              background: '#2d6b4f',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error?.digest && (
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 20, fontFamily: 'monospace' }}>
              ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
