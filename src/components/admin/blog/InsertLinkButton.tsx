'use client'

// Inserts a markdown link [text](url) at the cursor in the body
// textarea. Opens a small popover with two inputs:
//
//   1. URL                — paste the link target
//   2. Display text       — what the reader sees (pre-filled from
//                            the textarea selection if there is one)
//
// Saved links on the post (the URL+label pairs added under "Links")
// appear as one-click chips below the inputs so you don't have to
// retype them — clicking a chip fills both fields.

import { useEffect, useRef, useState } from 'react'
import { Link as LinkIcon, ChevronDown, X, Check } from 'lucide-react'
import type { BlogLink } from '@/lib/blog-db'

type Props = {
  // Saved links from the post's Links section. Used to populate
  // quick-pick chips inside the popover. Pass [] if there aren't any.
  links: BlogLink[]
  // Ref to the markdown textarea so we can read the selection and
  // splice into it at the right offset.
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  // Current body value (controlled component pattern). We splice
  // into it and call back with the new full string.
  value: string
  onChange: (next: string) => void
  className?: string
}

export default function InsertLinkButton({
  links, textareaRef, value, onChange, className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  // Snapshot the textarea selection AT THE MOMENT the popover opens
  // so that interacting with the popover (which steals focus) doesn't
  // collapse the selection before we get to insert. Without this the
  // splice would always land at offset 0.
  const selectionRef = useRef<{ start: number; end: number; selected: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Snapshot selection + reset fields when opening.
  useEffect(() => {
    if (!open) return
    const ta = textareaRef.current
    if (ta) {
      const start = ta.selectionStart ?? value.length
      const end = ta.selectionEnd ?? value.length
      const selected = value.slice(start, end)
      selectionRef.current = { start, end, selected }
      setText(selected) // pre-fill text from selection if any
    } else {
      selectionRef.current = { start: value.length, end: value.length, selected: '' }
      setText('')
    }
    setUrl('')
    // Focus URL field once the popover has rendered.
    requestAnimationFrame(() => urlInputRef.current?.focus())
  }, [open, textareaRef, value])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const insert = () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      urlInputRef.current?.focus()
      return
    }
    const trimmedText = text.trim() || trimmedUrl

    const sel = selectionRef.current ?? { start: value.length, end: value.length, selected: '' }
    const markdown = `[${trimmedText}](${trimmedUrl})`
    const next = value.slice(0, sel.start) + markdown + value.slice(sel.end)
    onChange(next)
    setOpen(false)

    // Restore caret position just after the inserted link.
    const ta = textareaRef.current
    if (ta) {
      setTimeout(() => {
        ta.focus()
        const pos = sel.start + markdown.length
        ta.setSelectionRange(pos, pos)
      }, 0)
    }
  }

  // Fill both fields from a saved link, ready for an Insert click.
  const fillFromSaved = (l: BlogLink) => {
    setUrl(l.url)
    if (!text.trim()) setText(l.label)
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Insert a markdown link at the cursor"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-md transition-colors"
      >
        <LinkIcon className="w-3.5 h-3.5" />
        Insert link
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Insert link</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-700 p-0.5"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">URL</label>
          <input
            ref={urlInputRef}
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') insert() }}
            placeholder="https://example.com"
            inputMode="url"
            autoComplete="off"
            className="w-full text-sm text-gray-800 font-mono border border-gray-200 rounded-md px-2 py-1.5 mb-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />

          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
            Display text
            {selectionRef.current?.selected && (
              <span className="ml-1.5 text-[9px] normal-case tracking-normal font-medium text-gray-400">
                (from your selection)
              </span>
            )}
          </label>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') insert() }}
            placeholder="What the reader sees"
            className="w-full text-sm text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <p className="text-[10px] text-gray-400 mt-1 leading-snug">
            Empty display text falls back to the URL itself.
          </p>

          {links.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                Or pick a saved link
              </p>
              <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                {links.map((l, i) => (
                  <li key={`${i}-${l.url}`}>
                    <button
                      type="button"
                      onClick={() => fillFromSaved(l)}
                      className="w-full text-left px-2 py-1 rounded-md hover:bg-brand-50 group"
                    >
                      <p className="text-xs font-semibold text-gray-900 group-hover:text-brand-700 truncate">
                        {l.label}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono truncate">{l.url}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 px-2 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={insert}
              disabled={!url.trim()}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 px-3 py-1.5 rounded-md"
            >
              <Check className="w-3.5 h-3.5" /> Insert
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
