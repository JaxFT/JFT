'use client'

// Admin-only panel for refreshing the offline download file. Lives on
// the EditablePreview page where Bec spends most of her editing time.
// One button: click → browser fetches the latest guide → renders the
// full self-contained HTML → uploads to Supabase Storage. Buyers
// stream that file from the download endpoint.

import { useState } from 'react'
import { Download, Loader2, Check, RefreshCw, X, AlertTriangle, ExternalLink } from 'lucide-react'
import type { GuideRow } from '@/lib/guide-types'
import { generateAndUploadDownload, type UploadResult } from '@/lib/admin-guide-pregen'

export default function DownloadFilePanel({ guide }: { guide: GuideRow }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<UploadResult | null>(null)
  const [showModal, setShowModal] = useState(false)

  const regen = async () => {
    setState('working')
    setError(null)
    setLastResult(null)
    try {
      const r = await fetch(`/api/admin/guides/${guide.id}`)
      if (!r.ok) throw new Error(`Could not fetch guide (HTTP ${r.status})`)
      const fresh: GuideRow = await r.json()
      const result = await generateAndUploadDownload(fresh)
      setLastResult(result)
      setState('done')
      setShowModal(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Regeneration failed')
      setState('error')
      setShowModal(true)
    }
  }

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-gray-500 inline-flex items-center gap-1.5 mb-1.5">
                <Download className="w-3.5 h-3.5" /> Offline download file
              </p>
              <p className="text-sm text-gray-700">
                Click after any edit so buyers see your latest version when they download.
              </p>
              <p className="text-xs text-gray-500 mt-1.5">
                Built in your browser, saved to storage. Auto-runs on publish.
              </p>
            </div>
            <button
              type="button"
              onClick={regen}
              disabled={state === 'working'}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2.5 rounded-md disabled:opacity-50 shrink-0"
            >
              {state === 'working' && <><Loader2 className="w-4 h-4 animate-spin" /> Building…</>}
              {state === 'done'    && <><Check className="w-4 h-4" /> Saved</>}
              {(state === 'idle' || state === 'error') && <><RefreshCw className="w-4 h-4" /> Refresh download file</>}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <ResultModal
          slug={guide.slug}
          result={lastResult}
          error={error}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

function ResultModal({
  slug,
  result,
  error,
  onClose,
}: {
  slug: string
  result: UploadResult | null
  error: string | null
  onClose: () => void
}) {
  const hasError = !!error || (result && result.report.imagesFailed > 0) || (result && result.report.coverPresent && !result.report.coverInlined)
  const allGood = result && !error && !hasError

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            {allGood ? (
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-700" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
            )}
            <h2 className="text-lg font-bold text-gray-900">
              {error
                ? 'Download file failed to build'
                : allGood
                  ? 'Download file ready'
                  : 'Built with warnings'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 -mr-2 -mt-2 p-2"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700 leading-relaxed mb-4">
            {error}
          </div>
        )}

        {result && (
          <ul className="space-y-2.5 text-sm mb-5">
            <ReportRow
              ok={result.report.coverPresent ? result.report.coverInlined : true}
              label={
                !result.report.coverPresent
                  ? 'No cover image set (skipped)'
                  : result.report.coverInlined
                    ? 'Cover image embedded'
                    : 'Cover image failed to embed'
              }
            />
            <ReportRow
              ok={result.report.imagesFailed === 0}
              label={
                result.report.imagesTotal === 0
                  ? 'No body images to embed'
                  : `${result.report.imagesInlined}/${result.report.imagesTotal} body image${result.report.imagesTotal === 1 ? '' : 's'} embedded`
              }
              detail={result.report.imagesFailed > 0
                ? `${result.report.imagesFailed} failed — buyers offline will see broken icons for those.`
                : undefined}
            />
            <ReportRow
              ok={true}
              label={
                result.report.tablesWrapped === 0
                  ? 'No tables in this guide'
                  : `${result.report.tablesWrapped} table${result.report.tablesWrapped === 1 ? '' : 's'} wrapped for scroll on narrow screens`
              }
            />
            <li className="text-xs text-gray-500 pt-1.5 border-t border-gray-100">
              Saved as <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{slug}.html</code> · {(result.bytes / 1024 / 1024).toFixed(2)} MB
            </li>
          </ul>
        )}

        {result && result.report.failedImageUrls.length > 0 && (
          <details className="mb-4">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              Show the {result.report.failedImageUrls.length} URL{result.report.failedImageUrls.length === 1 ? '' : 's'} that failed
            </summary>
            <ul className="mt-2 space-y-1 text-[11px] text-gray-500 max-h-32 overflow-y-auto">
              {result.report.failedImageUrls.map(u => (
                <li key={u} className="break-all">
                  <a href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 hover:text-brand-700">
                    <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" /> {u}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}

        <button
          type="button"
          onClick={onClose}
          className="btn-primary w-full justify-center !text-sm"
        >
          OK
        </button>
      </div>
    </div>
  )
}

function ReportRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className={`mt-0.5 inline-flex w-4 h-4 rounded-full items-center justify-center shrink-0 ${ok ? 'bg-emerald-100' : 'bg-amber-100'}`}>
        {ok ? <Check className="w-3 h-3 text-emerald-700" strokeWidth={3} /> : <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />}
      </span>
      <div className="flex-1">
        <p className="text-gray-800">{label}</p>
        {detail && <p className="text-xs text-gray-500 mt-0.5">{detail}</p>}
      </div>
    </li>
  )
}

