// Shown immediately after a guest completes a legacy PDF guide
// purchase without an account. Mirrors PostPurchaseDownload.tsx's
// visual style (the web-guide equivalent), but can't auto-fire the
// download the same way — the PDF flow returns a signed URL as JSON
// rather than streaming the file directly, so it needs one click
// through DownloadPdfButton rather than a hidden-iframe trick.

import { CheckCircle2 } from 'lucide-react'
import DownloadPdfButton from './DownloadPdfButton'

export default function PdfPostPurchase({
  slug, sessionId, email,
}: {
  slug: string
  sessionId: string
  email: string | null
}) {
  return (
    <div className="mt-6 bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 sm:p-7">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
        <p className="text-xs font-bold tracking-widest uppercase text-emerald-800">Thank you, you're all set</p>
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Your guide is ready</h3>
      <p className="text-sm text-gray-700 leading-relaxed mb-5">
        {email
          ? <>We&apos;ve emailed your Stripe receipt to <strong>{email}</strong>. Grab your PDF below, save it anywhere, it opens in any browser.</>
          : <>Grab your PDF below, save it anywhere, it opens in any browser.</>}
      </p>
      <DownloadPdfButton slug={slug} sessionId={sessionId} label="Download your guide" />
    </div>
  )
}
