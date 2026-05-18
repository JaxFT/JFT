'use client'

// Persistent image-slot panel for the guide editors.
//
// Shows EVERY image referenced in the body markdown as a manageable
// slot — both unfilled placeholders ([IMAGE], ![](placeholder), etc.)
// AND already-completed images (![caption](https://...)). So a guide
// that you already added photos to before this panel existed still
// surfaces those photos with Replace + Delete controls.
//
// Slot state model:
//   - originalRaw — the placeholder text we'd restore on Delete. Null
//     for slots discovered from an already-uploaded image (in that
//     case Delete just removes the image markdown entirely).
//   - upload     — { url, markdown } when the slot holds an image.
//                  null when it's an unfilled placeholder waiting for
//                  one.
//
// Reconciliation: on every body change we re-scan and try to keep
// existing slots whose anchor (uploaded markdown OR placeholder text)
// is still present. New refs in the body become new slots.

import { useEffect, useRef, useState } from 'react'
import {
  Image as ImageIcon, Upload, Loader2, Check, Trash2, RefreshCw,
} from 'lucide-react'
import { resizeImageIfLarge } from '@/lib/image-resize'

type ImageRef = {
  start: number
  end: number
  caption: string
  raw: string
  kind: 'placeholder' | 'uploaded'
  url?: string  // only present when kind === 'uploaded'
}

function detectImageRefs(md: string): ImageRef[] {
  const results: ImageRef[] = []

  // Unfilled placeholders — bracketed tokens like [IMAGE: caption].
  const tag = /\[(?:IMAGE|PHOTO|IMG|PIC|INSERT IMAGE|INSERT PHOTO)(?:\s*:\s*([^\]]*))?\]/gi
  let m: RegExpExecArray | null
  while ((m = tag.exec(md))) {
    results.push({
      start: m.index,
      end: m.index + m[0].length,
      caption: (m[1] ?? '').trim(),
      raw: m[0],
      kind: 'placeholder',
    })
  }

  // Empty / "placeholder URL" markdown like ![alt]() or ![alt](placeholder).
  // Note: NOT matching ![alt](http…), which is a real image — that's the
  // next pattern below.
  const empty = /!\[([^\]]*)\]\(\s*(?:placeholder|none|todo|tbd|insert\s+here|insert\s+image|#)?\s*\)/gi
  while ((m = empty.exec(md))) {
    results.push({
      start: m.index,
      end: m.index + m[0].length,
      caption: (m[1] ?? '').trim(),
      raw: m[0],
      kind: 'placeholder',
    })
  }

  // Completed image markdown — has a real URL inside the parens. We
  // accept http/https and protocol-relative; anything else (including
  // the explicit placeholder words above) is skipped to avoid double
  // matching.
  const full = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+|\/\/[^)\s]+)\)/g
  while ((m = full.exec(md))) {
    results.push({
      start: m.index,
      end: m.index + m[0].length,
      caption: (m[1] ?? '').trim(),
      raw: m[0],
      kind: 'uploaded',
      url: m[2],
    })
  }

  return results.sort((a, b) => a.start - b.start)
}

type Slot = {
  id: string
  // Text to restore on Delete. Null when the slot was discovered as
  // an already-uploaded image (Delete in that case removes the markdown).
  originalRaw: string | null
  caption: string
  upload: { url: string; markdown: string } | null
}

type Props = {
  body: string
  setBody: (next: string) => void
}

let SLOT_SEQ = 0

function refToInitialSlot(r: ImageRef): Slot {
  return {
    id: `slot-${++SLOT_SEQ}`,
    caption: r.caption,
    originalRaw: r.kind === 'placeholder' ? r.raw : null,
    upload: r.kind === 'uploaded' && r.url
      ? { url: r.url, markdown: r.raw }
      : null,
  }
}

export default function ImageSlotsPanel({ body, setBody }: Props) {
  const [slots, setSlots] = useState<Slot[]>(() =>
    detectImageRefs(body).map(refToInitialSlot),
  )
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reconcile slots with the current body markdown. We try to keep an
  // existing slot whenever its anchor text is still present, then
  // create new slots for any image refs in the body that weren't
  // claimed by a kept slot.
  useEffect(() => {
    const refs = detectImageRefs(body)

    setSlots(prev => {
      // Remaining refs we still need to claim.
      const remaining = [...refs]

      const claim = (predicate: (r: ImageRef) => boolean): ImageRef | null => {
        const idx = remaining.findIndex(predicate)
        if (idx === -1) return null
        const [r] = remaining.splice(idx, 1)
        return r
      }

      const kept: Slot[] = []
      for (const s of prev) {
        if (s.upload) {
          // Try to find a matching uploaded ref in body (same markdown).
          const r = claim(r => r.kind === 'uploaded' && r.raw === s.upload!.markdown)
          if (r) {
            kept.push(s)
            continue
          }
          // Markdown no longer present in the body. If we still know
          // its originalRaw, we keep the slot in case the user wants
          // to Replace (which would reinsert at end if needed).
          // Otherwise drop it.
          if (s.originalRaw) kept.push(s)
        } else if (s.originalRaw) {
          const r = claim(r => r.kind === 'placeholder' && r.raw === s.originalRaw)
          if (r) kept.push(s)
        }
      }

      // Anything left in remaining → new slot.
      const additions = remaining.map(refToInitialSlot)
      return [...kept, ...additions]
    })
  }, [body])

  if (slots.length === 0) return null

  const upload = async (slot: Slot, file: File) => {
    setError(null)
    setUploadingId(slot.id)
    try {
      const { file: prepared } = await resizeImageIfLarge(file)
      const form = new FormData()
      form.append('file', prepared)
      const res = await fetch('/api/admin/blog-photos/upload', { method: 'POST', body: form })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      const url = String(j.url)
      const newMarkdown = `![${slot.caption}](${url})`

      // Mutate body: replace the slot's current anchor (uploaded markdown
      // if it has one, otherwise its placeholder text). Append if neither
      // is in body (user edited manually).
      const anchor = slot.upload?.markdown ?? slot.originalRaw
      let nextBody: string
      if (anchor) {
        const idx = body.indexOf(anchor)
        nextBody = idx >= 0
          ? body.slice(0, idx) + newMarkdown + body.slice(idx + anchor.length)
          : `${body}\n\n${newMarkdown}`
      } else {
        nextBody = `${body}\n\n${newMarkdown}`
      }
      setBody(nextBody)

      setSlots(prev => prev.map(s =>
        s.id === slot.id ? { ...s, upload: { url, markdown: newMarkdown } } : s,
      ))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingId(null)
    }
  }

  const removeUpload = (slot: Slot) => {
    if (!slot.upload) return
    const anchor = slot.upload.markdown
    const idx = body.indexOf(anchor)
    if (idx >= 0) {
      if (slot.originalRaw) {
        // Restore the placeholder so the slot can be re-uploaded into.
        setBody(body.slice(0, idx) + slot.originalRaw + body.slice(idx + anchor.length))
        setSlots(prev => prev.map(s => (s.id === slot.id ? { ...s, upload: null } : s)))
      } else {
        // Pre-existing image with no placeholder to restore — drop the
        // image markdown entirely AND remove the slot from the list.
        // Trim a surrounding blank line so we don't leave gaping
        // whitespace.
        let cleaned = body.slice(0, idx) + body.slice(idx + anchor.length)
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trimEnd() + (body.endsWith('\n') ? '\n' : '')
        setBody(cleaned)
        setSlots(prev => prev.filter(s => s.id !== slot.id))
      }
    } else {
      // Anchor not in body — just drop the slot from state.
      if (slot.originalRaw) {
        setSlots(prev => prev.map(s => (s.id === slot.id ? { ...s, upload: null } : s)))
      } else {
        setSlots(prev => prev.filter(s => s.id !== slot.id))
      }
    }
  }

  const uploadedCount = slots.filter(s => s.upload).length

  return (
    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-bold tracking-widest uppercase text-amber-800 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          {slots.length} image slot{slots.length === 1 ? '' : 's'}
        </p>
        {uploadedCount > 0 && (
          <span className="text-xs font-semibold text-brand-800 inline-flex items-center gap-1">
            <Check className="w-3 h-3" /> {uploadedCount} uploaded
          </span>
        )}
      </div>
      <p className="text-xs text-amber-900/80 leading-relaxed">
        Every image in this section, whether uploaded today or already in the doc. Replace swaps the photo, the trash icon removes it (and restores the placeholder if there was one).
      </p>
      <div className="space-y-1.5 pt-1">
        {slots.map(slot => (
          <SlotRow
            key={slot.id}
            slot={slot}
            onUpload={file => upload(slot, file)}
            onDelete={() => removeUpload(slot)}
            uploading={uploadingId === slot.id}
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
    </div>
  )
}

function SlotRow({
  slot, onUpload, onDelete, uploading,
}: {
  slot: Slot
  onUpload: (file: File) => void
  onDelete: () => void
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isUploaded = !!slot.upload

  return (
    <div className={`flex items-center gap-2 border rounded-md px-3 py-2 transition-colors ${
      isUploaded ? 'bg-brand-50 border-brand-200' : 'bg-white border-amber-200'
    }`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onUpload(f)
          e.target.value = ''
        }}
      />
      {isUploaded && slot.upload && (
        <img
          src={slot.upload.url}
          alt={slot.caption || 'uploaded'}
          className="w-10 h-10 object-cover rounded shrink-0 border border-brand-300"
        />
      )}
      <div className="flex-1 min-w-0">
        {isUploaded ? (
          <p className="text-xs font-semibold text-brand-800 inline-flex items-center gap-1">
            <Check className="w-3 h-3" /> Uploaded
            {!slot.originalRaw && (
              <span className="text-gray-500 font-normal">&middot; existing image</span>
            )}
          </p>
        ) : (
          <p className="font-mono text-xs text-gray-500 truncate">{slot.originalRaw}</p>
        )}
        <p className="text-xs text-gray-700 truncate">
          {slot.caption || <em className="text-gray-400">(no caption)</em>}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded disabled:opacity-50 ${
            isUploaded
              ? 'text-brand-700 hover:bg-brand-100'
              : 'text-brand-700 hover:bg-brand-50'
          }`}
        >
          {uploading
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : isUploaded
              ? <RefreshCw className="w-3 h-3" />
              : <Upload className="w-3 h-3" />}
          {isUploaded ? 'Replace' : 'Upload'}
        </button>
        {isUploaded && (
          <button
            type="button"
            onClick={onDelete}
            disabled={uploading}
            className="inline-flex items-center text-xs font-semibold text-red-700 hover:bg-red-50 px-1.5 py-1 rounded disabled:opacity-50"
            title={slot.originalRaw ? 'Remove image and restore placeholder' : 'Remove image from body'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
