'use client'

import { useRef } from 'react'
import { Crosshair } from 'lucide-react'

// A click-to-set focal point picker. Shows the image at its natural
// aspect ratio with an overlay dot at the chosen focal point. Clicking
// anywhere on the image moves the dot to that point. The chosen point
// is then used as `object-position` on the cropped hero / card images
// so the subject of the photo stays visible.
export default function CoverFocalPicker({
  src,
  x,
  y,
  onChange,
}: {
  src: string
  x: number       // 0–100
  y: number       // 0–100
  onChange: (next: { x: number; y: number }) => void
}) {
  const imgWrapRef = useRef<HTMLDivElement>(null)

  const setFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = imgWrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * 100
    const py = ((e.clientY - rect.top) / rect.height) * 100
    onChange({ x: Math.max(0, Math.min(100, Math.round(px))), y: Math.max(0, Math.min(100, Math.round(py))) })
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
        <img
          src={src}
          alt="Cover focal point preview"
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

      {/* Cropped previews showing what the post hero + listing card will look like */}
      <div className="grid grid-cols-2 gap-3">
        <FocalPreviewBox label="Post hero (square)" src={src} x={x} y={y} aspect="1 / 1" />
        <FocalPreviewBox label="Listing card" src={src} x={x} y={y} aspect="16 / 9" />
      </div>
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
        <img
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
