'use client'

// Shown immediately after a successful Stripe purchase. Auto-fires
// the download in a hidden iframe on mount so the buyer doesn't have
// to do anything — they pay, return, and the file lands. The visible
// button is a fallback (browsers occasionally block auto-downloads
// when the page isn't yet user-interacted-with) plus a way to grab
// the file again on the same visit.
//
// Authorisation is the Stripe session_id itself; the server verifies
// it against Stripe before streaming the file. No account or sign-in
// is required, exactly as designed.

import { useEffect, useRef, useState } from 'react'
import { Download, CheckCircle2 } from 'lucide-react'

type Props = {
  slug: string
  sessionId: string
  email: string | null
}

export default function PostPurchaseDownload({ slug, sessionId, email }: Props) {
  const url = `/api/web-guides/${slug}/download?session_id=${encodeURIComponent(sessionId)}`
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [autoFired, setAutoFired] = useState(false)

  useEffect(() => {
    // Drive the iframe to the download URL once on mount. The browser
    // sees Content-Disposition: attachment and triggers a download
    // without navigating the visible page away.
    if (autoFired || !iframeRef.current) return
    iframeRef.current.src = url
    setAutoFired(true)
  }, [url, autoFired])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 sm:p-7">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <p className="text-xs font-bold tracking-widest uppercase text-emerald-800">
            Thank you — your guide is downloading
          </p>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Your offline copy is on the way
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed mb-5">
          {email
            ? <>The file is downloading now. We&apos;ve also emailed your Stripe receipt to <strong>{email}</strong>. Save the downloaded file anywhere — it opens in any browser, online or offline.</>
            : <>The file is downloading now. Save it anywhere — it opens in any browser, online or offline.</>}
        </p>
        <a
          href={url}
          download
          className="btn-primary !text-sm inline-flex"
        >
          <Download className="w-4 h-4" /> Download again
        </a>
        {/* Hidden iframe drives the auto-download. Visually nothing. */}
        <iframe ref={iframeRef} title="download" className="hidden" />
      </div>
    </div>
  )
}
