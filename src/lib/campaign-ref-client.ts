'use client'

// Resolves which campaign (if any) the current visitor is attributed
// to. The ?ref= query string wins when present (the guide page they
// just landed on via /l/[code]), falling back to the jft_ref cookie
// set by that redirect — covers a visitor who browses around or
// leaves and comes back later before buying, once the query string
// is long gone from the URL.
export function getCampaignRef(): string | null {
  if (typeof window === 'undefined') return null

  const fromQuery = new URLSearchParams(window.location.search).get('ref')
  if (fromQuery) return fromQuery

  const match = document.cookie.match(/(?:^|;\s*)jft_ref=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}
