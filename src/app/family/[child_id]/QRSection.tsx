'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, RotateCcw, Copy, Check, Loader2, ExternalLink, AlertTriangle } from 'lucide-react'

export default function QRSection({
  childId,
  childName,
  initialToken,
}: {
  childId: string
  childName: string
  initialToken: string
}) {
  const router = useRouter()
  const [token, setToken] = useState(initialToken)
  const [regenerating, setRegenerating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Build the kid URL from the current window's origin so it works in
  // dev (localhost) and prod (jaxfamilytravels.com) without a hardcoded
  // domain. The server has rendered the page with the user's actual
  // current token, so this is correct on first paint too.
  const kidUrl = typeof window !== 'undefined' ? `${window.location.origin}/kid/${token}` : `/kid/${token}`

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(kidUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy. Long-press the URL to copy manually.')
    }
  }

  const regenerate = async () => {
    setRegenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/regenerate-qr`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.qr_token) throw new Error(body.error || `HTTP ${res.status}`)
      setToken(body.qr_token)
      setConfirming(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not regenerate')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">QR code</h2>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        {childName} opens their passport by scanning this code on a parent&apos;s phone. Print it, save it as a photo, or pin it to a fridge.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-start">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 inline-flex justify-self-center sm:justify-self-start">
          <QRCodeSVG
            value={kidUrl}
            size={180}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#0f3a2a"
          />
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Direct URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-md px-3 py-2 break-all">
                {kidUrl}
              </code>
              <button
                onClick={copyUrl}
                className="shrink-0 p-2 text-gray-500 hover:text-brand-600 hover:bg-gray-50 rounded-md"
                aria-label="Copy URL"
                title="Copy"
              >
                {copied ? <Check className="w-4 h-4 text-brand-600" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={kidUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-2 text-gray-500 hover:text-brand-600 hover:bg-gray-50 rounded-md"
                aria-label="Open in new tab"
                title="Open"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            {confirming ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-900 mb-2 inline-flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Regenerating will invalidate the current QR code immediately. Anyone with the old code or URL will lose access.</span>
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={regenerate}
                    disabled={regenerating}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 px-3 py-1.5 rounded-md disabled:opacity-60"
                  >
                    {regenerating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Working…</> : 'Yes, regenerate'}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={regenerating}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-md"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Regenerate QR code
              </button>
            )}
            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-3">{error}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
