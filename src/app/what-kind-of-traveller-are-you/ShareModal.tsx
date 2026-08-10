'use client'

// Preview-first share flow: shows the actual 9:16 card before doing
// anything with it, rather than firing straight into a share sheet or
// download blind. Matches the modal pattern already used in
// EmailResultModal.tsx (fixed inset-0 overlay, click-outside-to-close,
// white rounded card).

import { useState } from 'react'
import { Check, Download, Loader2, Share2, X } from 'lucide-react'
import { TRAVELLER_TYPES, type TravellerTypeId } from './quiz-data'

type Props = {
  typeId: TravellerTypeId
  onClose: () => void
}

export default function ShareModal({ typeId, onClose }: Props) {
  const result = TRAVELLER_TYPES[typeId]
  // `v` busts Cloudflare's edge cache (the card route sets a 1-year
  // immutable cache-control), bump it any time card/route.tsx's visual
  // output changes so a stale cached PNG doesn't linger for a type
  // someone already generated a link for.
  const cardUrl = `/what-kind-of-traveller-are-you/card?type=${typeId}&v=3`
  const pageUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/what-kind-of-traveller-are-you?type=${typeId}`
    : ''
  const title = `I got ${result.name} on the Jax Family Travels quiz`

  // navigator.canShare can be checked synchronously against an empty
  // File of the right mime type, no need to fetch the real image just
  // to know whether the "Share" button should show up.
  const [canShareFiles] = useState(
    () => typeof navigator !== 'undefined'
      && !!navigator.canShare?.({ files: [new File([], 'card.png', { type: 'image/png' })] }),
  )
  const [shareState, setShareState] = useState<'idle' | 'working' | 'done'>('idle')
  const [doneLabel, setDoneLabel] = useState('')

  const finishDone = (label: string) => {
    setDoneLabel(label)
    setShareState('done')
    setTimeout(() => setShareState('idle'), 2200)
  }

  const fetchCardFile = async () => {
    const res = await fetch(cardUrl)
    if (!res.ok) throw new Error('Card image request failed')
    const blob = await res.blob()
    return { blob, file: new File([blob], 'my-traveller-type.png', { type: 'image/png' }) }
  }

  const doShare = async () => {
    if (shareState === 'working') return
    setShareState('working')
    try {
      const { file } = await fetchCardFile()
      await navigator.share({ files: [file], title, text: title, url: pageUrl })
      setShareState('idle')
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // User dismissed the native share sheet, not a failure.
        setShareState('idle')
        return
      }
      setShareState('idle')
    }
  }

  const doDownload = async () => {
    if (shareState === 'working') return
    setShareState('working')
    try {
      const { blob } = await fetchCardFile()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = 'my-traveller-type.png'
      a.click()
      URL.revokeObjectURL(objectUrl)
      finishDone('Image downloaded')
    } catch {
      setShareState('idle')
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl)
      finishDone('Link copied')
    } catch {
      setShareState('idle')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 id="share-modal-title" className="text-base font-bold text-gray-900">Share your result</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm mb-4 bg-gray-50" style={{ aspectRatio: '9 / 16' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardUrl} alt={`${result.name} result card`} className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col gap-2">
            {canShareFiles && (
              <button onClick={doShare} disabled={shareState === 'working'} className="btn-primary justify-center w-full !py-2.5 disabled:opacity-60">
                {shareState === 'working' ? (<><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>) : (<><Share2 className="w-4 h-4" /> Share image</>)}
              </button>
            )}
            <button onClick={doDownload} disabled={shareState === 'working'} className="btn-outline justify-center w-full !py-2.5 disabled:opacity-60">
              {shareState === 'done' && doneLabel === 'Image downloaded' ? (<><Check className="w-4 h-4" /> Downloaded</>) : (<><Download className="w-4 h-4" /> Download image</>)}
            </button>
            <button onClick={copyLink} className="text-xs font-semibold text-gray-500 hover:text-gray-900 text-center py-1.5">
              {shareState === 'done' && doneLabel === 'Link copied' ? 'Link copied' : 'Or copy the quiz link instead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
