// Client-side: renders the offline-download HTML for a guide in the
// admin browser and uploads it to Supabase Storage via the admin API.
//
// Runs in the browser so the heavy image-fetch + base64 work doesn't
// hit the 10ms-per-request CPU cap on Workers Free. The result lives
// in `guide-downloads/{slug}.html` and is streamed (with email
// watermark substitution) by the user-facing download endpoint.

'use client'

import { renderGuideHtml } from '@/lib/web-guide-download'
import { proxyImageUrl } from '@/lib/image-proxy'
import type { GuideRow } from '@/lib/guide-types'

// Rewrite any absolute Supabase Storage URLs in a string to absolute
// /img/ proxy URLs on the current origin. Same-origin fetch sidesteps
// any CORS oddness when the browser pulls images for inlining.
function rewriteForBrowser(text: string, origin: string): string {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabase) return text
  const prefix = `${supabase}/storage/v1/object/public/`
  // Replace every occurrence; URLs may appear in src= attributes, in
  // markdown image syntax, anywhere.
  return text.split(prefix).join(`${origin}/img/`)
}

function rewriteGuideForBrowser(guide: GuideRow, origin: string): GuideRow {
  return {
    ...guide,
    cover_image: proxyImageUrl(guide.cover_image) || null,
    intro_markdown: rewriteForBrowser(guide.intro_markdown, origin),
    body_markdown: rewriteForBrowser(guide.body_markdown, origin),
    sections: guide.sections, // legacy blocks — unused by new model
  }
}

// Make sure cover_image and proxy URLs are absolute so the server-
// side download endpoint (and any future processors) can also fetch
// them if it ever has to.
function absolutise(html: string, origin: string): string {
  return html.split('src="/img/').join(`src="${origin}/img/`)
}

export async function generateAndUploadDownload(guide: GuideRow): Promise<void> {
  if (typeof window === 'undefined') throw new Error('admin-guide-pregen runs in the browser only')
  const origin = window.location.origin
  const browserGuide = rewriteGuideForBrowser(guide, origin)
  // Pass undefined as buyerEmail so the watermark area becomes a
  // placeholder string that the download endpoint substitutes per
  // buyer at serve time.
  let html = await renderGuideHtml(browserGuide, undefined)
  html = absolutise(html, origin)

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
