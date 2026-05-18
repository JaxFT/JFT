'use client'

// Persistent image-slot panel for the guide editors.
//
// Replaces the old behaviour where uploading a photo to a placeholder
// removed that slot from the list. Now each slot sticks around:
//   - unuploaded → shows the original placeholder text + Upload button
//   - uploaded   → shows the thumbnail in green with Replace + Delete
//                  buttons. Delete restores the original placeholder
//                  text in the body so the slot reverts to its
//                  pre-upload state.
//
// Slot state is reconciled with the body markdown on every change:
// new placeholders typed into the body show up as new slots; deleted
// placeholders (where their text isn't in the body any more AND no
// upload has happened against them) drop out.

import { useEffect, useRef, useState } from 'react'
import {
  Image as ImageIcon, Upload, Loader2, Check, Trash2, RefreshCw,
} from 'lucide-react'

type Placeholder = { start: number; end: number; caption: string; raw: string }

function detectImagePlaceholders(md: string): Placeholder[] {
  const results: Placeholder[] = []
  const tag = /\[(?:IMAGE|PHOTO|IMG|PIC|INSERT IMAGE|INSERT PHOTO)(?:\s*:\s*([^\]]*))?\]/gi
  let m: RegExpExecArray | null
  while ((m = tag.exec(md))) {
    results.push({
      start: m.index,
      end: m.index + m[0].length,
      caption: (m[1] ?? '').trim(),
      raw: m[0],
    })
  }
  const img = /!\[([^\]]*)\]\(\s*(?:placeholder|none|todo|tbd|insert\s+here|insert\s+image|#)?\s*\)/gi
  while ((m = img.exec(md))) {
    results.push({
      start: m.index,
      end: m.index + m[0].length,
      caption: (m[1] ?? '').trim(),
      raw: m[0],
    })
  }
  return results.sort((a, b) => a.start - b.start)
}

type Slot = {
  id: string
  originalRaw: string
  caption: string
  upload?: { url: string; markdown: string }
}

type Props = {
  body: string
  setBody: (next: string) => void
}

let SLOT_SEQ = 0

export default function ImageSlotsPanel({ body, setBody }: Props) {
  const [slots, setSlots] = useState<Slot[]>(() =>
    detectImagePlaceholders(body).map(p => ({
      id: `slot-${++SLOT_SEQ}`,
      originalRaw: p.raw,
      caption: p.caption,
    })),
  )
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reconcile slot list with whatever's currently in the body.
  //  - Uploaded slots: keep regardless (the inserted markdown lives in
  //    the body; if the user manually deleted it, replace will reinsert,
  //    delete will silently no-op the body change.)
  //  - Unuploaded slots: keep one per occurrence of their originalRaw
  //    that's still in the body; drop the rest.
  //  - Any placeholder in the body not matched above becomes a new slot.
  useEffect(() => {
    const placeholders = detectImagePlaceholders(body)
    const remainingRaws = placeholders.map(p => p.raw)

    setSlots(prev => {
      const kept: Slot[] = []
      for (const s of prev) {
        if (s.upload) {
          kept.push(s)
          continue
        }
        const idx = remainingRaws.indexOf(s.originalRaw)
        if (idx >= 0) {
          kept.push(s)
          remainingRaws.splice(idx, 1)
        }
      }
      const newSlots: Slot[] = remainingRaws.map(raw => {
        const p = placeholders.find(p => p.raw === raw)!
        return {
          id: `slot-${++SLOT_SEQ}`,
          originalRaw: raw,
          caption: p.caption,
        }
      })
      return [...kept, ...newSlots]
    })
  }, [body])

  if (slots.length === 0) return null

  const upload = async (slot: Slot, file: File) => {
    setError(null)
    setUploadingId(slot.id)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/blog-photos/upload', { method: 'POST', body: form })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      const url = String(j.url)
      const newMarkdown = `![${slot.caption}](${url})`

      // Mutate the body string: if this slot was previously uploaded,
      // replace the prior inserted markdown; otherwise replace the
      // original placeholder text. Fall back to appending if neither
      // anchor is found (user edited the body manually).
      let nextBody: string
      const anchor = slot.upload?.markdown ?? slot.originalRaw
      const idx = body.indexOf(anchor)
      if (idx >= 0) {
        nextBody = body.slice(0, idx) + newMarkdown + body.slice(idx + anchor.length)
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

  const deleteUpload = (slot: Slot) => {
    if (!slot.upload) return
    // Restore the original placeholder text in the body if the inserted
    // markdown is still there. If not (manual edit), just clear slot state.
    const idx = body.indexOf(slot.upload.markdown)
    if (idx >= 0) {
      setBody(body.slice(0, idx) + slot.originalRaw + body.slice(idx + slot.upload.markdown.length))
    }
    setSlots(prev => prev.map(s => (s.id === slot.id ? { ...s, upload: undefined } : s)))
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
        Upload a photo for each slot — it replaces the placeholder in the text. Uploaded slots stay here so you can swap or remove later; removing restores the original placeholder.
      </p>
      <div className="space-y-1.5 pt-1">
        {slots.map(slot => (
          <SlotRow
            key={slot.id}
            slot={slot}
            onUpload={file => upload(slot, file)}
            onDelete={() => deleteUpload(slot)}
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
            title="Remove uploaded image and restore placeholder"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
