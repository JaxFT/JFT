'use client'

import { useEffect, useRef, useState } from 'react'
import { Crosshair, Check, Loader2, Save } from 'lucide-react'

export type FocalPreviewConfig = { label: string; aspect: string }

const DEFAULT_PREVIEWS: FocalPreviewConfig[] = [
  { label: 'Post hero (square)', aspect: '1 / 1' },
  { label: 'Listing card', aspect: '16 / 9' },
]

// A click-to-set focal point picker. Shows the image at its natural
// aspect ratio with an overlay dot at the chosen focal point. Clicking
// anywhere on the image moves the dot to that point. The chosen point
// is then used as `object-position` on the cropped hero / card images
// so the subject of the photo stays visible.
//
// Originally blog-only (cover_focal_x/y on blog_posts), generalised
// so other features with a similar "one photo, cropped at a few fixed
// aspect ratios" need (Travel Profile hero photo) can reuse it — pass
// `previews` to relabel/resize the crop preview boxes for your case.
//
// If `onSave` is provided, an inline "Save focal point" button appears
// below the previews so the user doesn't need to scroll to the form's
// main Save button, useful in long forms.
export default function CoverFocalPicker({
  src,
  x,
  y,
  onChange,
  onSave,
  previews = DEFAULT_PREVIEWS,
}: {
  src: string
  x: number       // 0–100
  y: number       // 0–100
  onChange: (next: { x: number; y: number }) => void
  onSave?: (next: { x: number; y: number }) => Promise<void> | void
  previews?: FocalPreviewConfig[]
}) {
  const imgWrapRef = useRef<HTMLDivElement>(null)

  // Track the focal point that was last successfully saved so we can show
  // an "Unsaved changes" hint until the user clicks Save.
  const [savedAt, setSavedAt] = useState<{ x: number; y: number } | null>({ x, y })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Clear the "Saved" pulse after a couple of seconds.
  useEffect(() => {
    if (status !== 'saved') return
    const t = setTimeout(() => setStatus('idle'), 2000)
    return () => clearTimeout(t)
  }, [status])

  const setFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = imgWrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * 100
    const py = ((e.clientY - rect.top) / rect.height) * 100
    onChange({ x: Math.max(0, Math.min(100, Math.round(px))), y: Math.max(0, Math.min(100, Math.round(py))) })
  }

  const hasUnsaved = !!onSave && (!savedAt || savedAt.x !== x || savedAt.y !== y)

  const save = async () => {
    if (!onSave) return
    setStatus('saving')
    setError(null)
    try {
      await onSave({ x, y })
      setSavedAt({ x, y })
      setStatus('saved')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-600 inline-flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-brand-600" />
          Click on the photo to set the focal point
        </p>
        <button
          type="button"
          onClick={() => onChange({ x: 50, y: 50 })}
          className="text-xs text-gray-500 hover:text-brand-700 underline-offset-2 hover:underline"
        >
          Reset to centre
        </button>
      </div>

      <div
        ref={imgWrapRef}
        onClick={setFromEvent}
        className="relative w-full bg-gray-100 rounded-xl overflow-hidden cursor-crosshair select-none border border-gray-200"
        title="Click to set focal point"
      >
        {/* The natural-aspect preview. We use a max height so very tall
            portraits don't dominate the layout. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy"
          src={src}
          alt="Focal point preview"
          className="block w-full max-h-96 object-contain mx-auto pointer-events-none"
          draggable={false}
        />

        {/* Dot marker */}
        <div
          className="absolute pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="w-6 h-6 rounded-full bg-white border-2 border-brand-600 shadow-lg" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-700" />
        </div>
      </div>

      {/* Cropped previews showing what the photo will look like at each aspect ratio it's actually shown at */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${previews.length}, minmax(0, 1fr))` }}>
        {previews.map(p => (
          <FocalPreviewBox key={p.label} label={p.label} src={src} x={x} y={y} aspect={p.aspect} />
        ))}
      </div>

      {onSave && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-xs">
            {status === 'saving' && <span className="text-gray-500 inline-flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</span>}
            {status === 'saved'  && <span className="text-brand-700 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Focal point saved</span>}
            {status === 'error'  && <span className="text-red-700">{error}</span>}
            {status === 'idle' && hasUnsaved && <span className="text-amber-700">Unsaved focal point</span>}
            {status === 'idle' && !hasUnsaved && <span className="text-gray-400">Focal point at {x}%, {y}%</span>}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={status === 'saving' || !hasUnsaved}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" /> Save focal point
          </button>
        </div>
      )}
    </div>
  )
}

function FocalPreviewBox({
  label, src, x, y, aspect,
}: { label: string; src: string; x: number; y: number; aspect: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">{label}</p>
      <div
        className="w-full overflow-hidden rounded-md border border-gray-200 bg-gray-100"
        style={{ aspectRatio: aspect }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy"
          src={src}
          alt={label}
          className="w-full h-full object-cover"
          style={{ objectPosition: `${x}% ${y}%` }}
          draggable={false}
        />
      </div>
    </div>
  )
}
