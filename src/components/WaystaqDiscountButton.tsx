'use client'

// CTA button that fetches a signed bridge token from JFT's server,
// then redirects to WayStaq's discount checkout. Falls through to the
// regular waystaq.com page if the visitor isn't a JFT premium member
// (or anything else goes wrong) so the link is always useful.
//
// The server endpoint (/api/waystaq/upgrade-link) keeps the shared
// secret server-side — it's never sent to the browser.

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

type Props = {
  label: string
  // Where to send visitors who can't get the discount (logged out,
  // not premium, or anything else returning a non-2xx).
  fallbackHref: string
  // Styling lives on the button. Keeps the component layout-agnostic.
  className?: string
  style?: React.CSSProperties
  // Renders an arrow icon on the right when true. Most JFT CTAs use one;
  // disabled for the rare button that doesn't.
  withArrow?: boolean
}

export default function WaystaqDiscountButton({
  label, fallbackHref, className = '', style, withArrow = true,
}: Props) {
  const [loading, setLoading] = useState(false)
  const click = async () => {
    if (loading) return
    setLoading(true)
    try {
      const r = await fetch('/api/waystaq/upgrade-link', { credentials: 'include' })
      if (r.ok) {
        const { url } = await r.json()
        if (typeof url === 'string') {
          window.location.href = url
          return
        }
      }
      // 401 / 403 / 500 / etc — just go to the regular WayStaq page.
      // Visitor still gets to WayStaq, they just won't have the discount
      // pre-applied. WayStaq's Stripe re-check would have blocked it
      // anyway if they're not actually premium.
      window.location.href = fallbackHref
    } catch {
      window.location.href = fallbackHref
    }
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={loading}
      className={className}
      style={style}
    >
      {loading ? 'Loading…' : label}
      {withArrow && !loading && <ArrowRight className="w-4 h-4" />}
    </button>
  )
}
