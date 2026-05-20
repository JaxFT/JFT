'use client'

// Tiny share button. Uses navigator.share on devices that support it
// (every mobile browser + Chrome/Edge/Safari on desktop) — pops the
// native OS share sheet so users can pick WhatsApp, Instagram DM,
// Messages, etc. Falls back to copy-link with a "Copied!" flash on
// older desktop browsers.

import { useState } from 'react'
import { Share2, Check, Link2 } from 'lucide-react'

type Variant = 'compact' | 'icon-only'

type Props = {
  url: string
  title: string
  // Optional intro text the native sheet may use (e.g. "Read this on
  // Jax Family Travels:"). Most apps ignore it but it's nice when
  // present.
  text?: string
  variant?: Variant
  className?: string
  // Stop the click from bubbling up to parent links (e.g. a card
  // wrapper that navigates to the post when clicked).
  stopPropagation?: boolean
}

export default function ShareButton({
  url, title, text, variant = 'compact', className = '', stopPropagation = true,
}: Props) {
  const [copied, setCopied] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault()
      e.stopPropagation()
    }
    // Resolve to an absolute URL — navigator.share rejects relative ones.
    const absolute = url.startsWith('http') ? url : `${window.location.origin}${url}`

    // Native share sheet path.
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ url: absolute, title, text })
        return
      } catch {
        // User cancelled or share failed — fall through to copy-link.
      }
    }
    // Copy-to-clipboard fallback.
    try {
      await navigator.clipboard.writeText(absolute)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Last-ditch: prompt with the URL so user can copy manually.
      window.prompt('Copy this link:', absolute)
    }
  }

  if (variant === 'icon-only') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Share this post"
        title="Share"
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:text-brand-700 hover:bg-brand-50 transition-colors ${className}`}
      >
        {copied
          ? <Check className="w-4 h-4 text-brand-700" />
          : <Share2 className="w-4 h-4" />}
      </button>
    )
  }

  // compact (default) — small text label
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-700 transition-colors ${className}`}
    >
      {copied
        ? <><Check className="w-3.5 h-3.5 text-brand-700" /> <span className="text-brand-700">Link copied</span></>
        : <><Share2 className="w-3.5 h-3.5" /> Share</>}
    </button>
  )
}
