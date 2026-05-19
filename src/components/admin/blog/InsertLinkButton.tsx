'use client'

// Drops one of the saved blog links (URL + label pairs) into the body
// markdown at the current cursor position, as a proper [label](url).
// Lives next to the body textarea in the wizard + edit form so when
// the AI forgets to weave a link in, you can paste it in two clicks.
//
// Re-uses the existing `links` array on the post — no new state. If
// the post has no saved links, the button is disabled with a hint.

import { useRef, useState, useEffect } from 'react'
import { Link as LinkIcon, ChevronDown, X } from 'lucide-react'
import type { BlogLink } from '@/lib/blog-db'

type Props = {
  links: BlogLink[]
  // A ref to the markdown textarea so we can read the selection and
  // patch the value at the right offset.
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  // Current body value (controlled component pattern) so we can
  // splice into it and call back with the new full string.
  value: string
  onChange: (next: string) => void
  // Optional: place the button inline somewhere specific. Defaults
  // to a small "Insert link" button.
  className?: string
}

export default function InsertLinkButton({
  links, textareaRef, value, onChange, className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const insert = (link: BlogLink) => {
    const ta = textareaRef.current
    if (!ta) return
    // If the user has selected some text, wrap THAT as the link text,
    // so they can highlight "book the spa" and turn it into
    // "[book the spa](https://...)". Otherwise drop the label.
    const start = ta.selectionStart ?? value.length
    const end = ta.selectionEnd ?? value.length
    const selected = value.slice(start, end)
    const linkText = selected.trim().length > 0 ? selected : link.label
    const markdown = `[${linkText}](${link.url})`
    const next = value.slice(0, start) + markdown + value.slice(end)
    onChange(next)
    setOpen(false)
    // Restore focus + place the cursor just after the inserted link.
    setTimeout(() => {
      ta.focus()
      const pos = start + markdown.length
      ta.setSelectionRange(pos, pos)
    }, 0)
  }

  const hasLinks = links.length > 0

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => hasLinks && setOpen(o => !o)}
        disabled={!hasLinks}
        title={hasLinks ? 'Insert one of your saved links into the body' : 'Add a saved link first'}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
          hasLinks
            ? 'text-brand-700 bg-brand-50 hover:bg-brand-100'
            : 'text-gray-400 bg-gray-50 cursor-not-allowed'
        }`}
      >
        <LinkIcon className="w-3.5 h-3.5" />
        Insert link
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && hasLinks && (
        <div className="absolute right-0 z-30 mt-1.5 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-2">
          <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Saved links</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-700 p-0.5"
              aria-label="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 px-2 mb-2 leading-snug">
            Highlight some body text first to turn it into the link, or just click — we&apos;ll use the label.
          </p>
          <ul className="space-y-0.5 max-h-60 overflow-y-auto">
            {links.map((l, i) => (
              <li key={`${i}-${l.url}`}>
                <button
                  type="button"
                  onClick={() => insert(l)}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-brand-50 group"
                >
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 truncate">
                    {l.label}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono truncate">{l.url}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
