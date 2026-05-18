'use client'

// PDF management strip shown on the admin preview, just below the
// cover hero. Three things:
//   1. "Download PDF", opens /admin/guides/[id]/print in a new tab.
//      That route auto-fires window.print() so the writer just hits
//      Save as PDF and gets the file.
//   2. "Upload PDF", drops the saved PDF back to the server. Lands in
//      the guide-files bucket at web/<slug>.pdf and the guides row's
//      pdf_path is updated.
//   3. Current status, shows whether a PDF is uploaded, with a
//      Remove button.

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Download, Upload, Loader2, Check, Trash2, FileText, ExternalLink,
} from 'lucide-react'

type Props = {
  guideId: string
  hasPdf: boolean
}

export default function PdfPanel({ guideId, hasPdf }: Props) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localHasPdf, setLocalHasPdf] = useState(hasPdf)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setError(null)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please pick a PDF file.')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/admin/guides/${guideId}/pdf`, {
        method: 'POST',
        body: form,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setLocalHasPdf(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remove the uploaded PDF? Buyers will not be able to download until you upload a new one.')) return
    setError(null)
    setRemoving(true)
    try {
      const res = await fetch(`/api/admin/guides/${guideId}/pdf`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setLocalHasPdf(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-brand-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">PDF version</p>
              {localHasPdf ? (
                <p className="text-xs text-brand-700 mt-0.5 inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Uploaded &middot; available to buyers
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5">
                  No PDF uploaded yet. Print and save, then upload below.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <a
              href={`/admin/guides/${guideId}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-md"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleUpload(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || removing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-2 rounded-md disabled:opacity-50"
            >
              {uploading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                : <><Upload className="w-3.5 h-3.5" /> {localHasPdf ? 'Replace PDF' : 'Upload PDF'}</>}
            </button>

            {localHasPdf && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading || removing}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:bg-red-50 px-2 py-2 rounded-md disabled:opacity-50"
                title="Remove uploaded PDF"
              >
                {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-3">{error}</p>
        )}

        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          <strong className="text-gray-600">How:</strong> click <em>Download PDF</em>, the print dialog opens. Pick <em>Save as PDF</em>, save the file, then come back here and click <em>Upload PDF</em>. Desktop Chrome gives the cleanest result. We don&apos;t do this automatically, browser print-to-PDF quality varies too much.
        </p>
      </div>
    </div>
  )
}
