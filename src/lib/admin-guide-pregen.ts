// Client-side: renders the offline-download HTML for a guide in the
// admin browser and uploads it to Supabase Storage via the admin API.
//
// Runs in the browser so the heavy image-fetch + base64 work doesn't
// hit the 10ms-per-request CPU cap on Workers Free. The result lives
// in `guide-downloads/{slug}.html` and is streamed (with email
// watermark substitution) by the user-facing download endpoint.

'use client'

import { renderGuideHtml } from '@/lib/web-guide-download'
import type { GuideRow } from '@/lib/guide-types'

// We deliberately skip the /img/ proxy rewrite in this browser-side
// flow. Routing 15 simultaneous image fetches through our own worker
// trips Cloudflare's 503 burst protection on Workers Free — the
// proxy was designed for cached one-at-a-time loads on user pages,
// not a parallel batch.
//
// Supabase Storage's public bucket serves Access-Control-Allow-
// Origin: *, so the browser can fetch directly from Supabase with
// no CORS issue. Worker isn't involved, no rate limits hit.

export async function generateAndUploadDownload(guide: GuideRow): Promise<void> {
  if (typeof window === 'undefined') throw new Error('admin-guide-pregen runs in the browser only')

  // Pass undefined as buyerEmail so the watermark area becomes a
  // placeholder string that the download endpoint substitutes per
  // buyer at serve time.
  const html = await renderGuideHtml(guide, undefined)

  const res = await fetch(`/api/admin/guides/${guide.id}/upload-download`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: html,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Upload failed (HTTP ${res.status})`)
  }
}
