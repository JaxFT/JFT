'use client'

// Fires a single fire-and-forget POST to the guide view-tracking
// endpoint per (tab, slug). Dedupes via sessionStorage so a Cmd-R
// refresh while reading doesn't bump the counter twice. Closing the
// tab and coming back later counts as a new view, which feels right.
//
// Direct mirror of BlogPostViewTracker.

import { useEffect } from 'react'
import { getCampaignRef } from '@/lib/campaign-ref-client'

const STORAGE_PREFIX = 'jft.guide.viewed.'

export default function GuideViewTracker({ slug, kind = 'web' }: { slug: string; kind?: 'web' | 'legacy' }) {
  useEffect(() => {
    if (!slug) return
    const key = STORAGE_PREFIX + slug
    let firstViewThisSession = true
    try {
      if (sessionStorage.getItem(key)) {
        firstViewThisSession = false
      } else {
        sessionStorage.setItem(key, '1')
      }
    } catch {
      // Private mode / storage blocked, fall through and just track
      // the view. Same tab will then count multiple refreshes, which
      // is fine, those visitors are rare.
    }
    if (!firstViewThisSession) return

    const base = kind === 'legacy' ? '/api/guides' : '/api/web-guides'
    void fetch(`${base}/${encodeURIComponent(slug)}/view`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => {
      // Network blip, ignore.
    })

    const ref = getCampaignRef()
    if (ref) {
      void fetch('/api/campaign/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'view', guideSlug: slug, ref }),
        keepalive: true,
      }).catch(() => {})
    }
  }, [slug, kind])

  return null
}
