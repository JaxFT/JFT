import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkAutoLink, type AutoLinkPhrase } from '@/lib/blog-links'
import { Callout, detectCalloutFromText } from './Callout'
import type { ReactNode } from 'react'

export type ImageSize = 'small' | 'medium' | 'large' | 'full'
export type ImageAlign = 'center' | 'left' | 'right'
export type ImageCrop = 'none' | 'square' | 'wide' | 'tall'

export type ImageOpts = {
  size: ImageSize
  align: ImageAlign
  crop: ImageCrop
  // 0–100, percentage from the top-left of the source image. Used as
  // CSS `object-position` so the writer can pick what stays in frame
  // when the image is cropped.
  focusX: number
  focusY: number
}

export const DEFAULT_IMAGE_OPTS: ImageOpts = {
  size: 'medium',
  align: 'center',
  crop: 'none',
  focusX: 50,
  focusY: 50,
}

// Read size / align / crop / focus tokens out of a markdown image title:
//   ![alt](url "size:large align:left crop:square focus:30,70")
// Any token can be omitted and falls back to its default. Tokens can
// appear in any order, separated by whitespace. Anything else in the
// title is treated as a caption and preserved on write.
export function parseImageOpts(title: string | null | undefined): ImageOpts {
  const out: ImageOpts = { ...DEFAULT_IMAGE_OPTS }
  if (!title) return out
  const sz = title.match(/size\s*[:=]\s*(small|medium|large|full)/i)
  const al = title.match(/align\s*[:=]\s*(center|centre|left|right)/i)
  const cr = title.match(/crop\s*[:=]\s*(none|square|wide|tall)/i)
  const fc = title.match(/focus\s*[:=]\s*(\d{1,3})%?\s*[,/x]\s*(\d{1,3})%?/i)
  if (sz) out.size = sz[1].toLowerCase() as ImageSize
  if (al) {
    const v = al[1].toLowerCase()
    out.align = (v === 'centre' ? 'center' : v) as ImageAlign
  }
  if (cr) out.crop = cr[1].toLowerCase() as ImageCrop
  if (fc) {
    out.focusX = clamp(parseInt(fc[1], 10), 0, 100)
    out.focusY = clamp(parseInt(fc[2], 10), 0, 100)
  }
  return out
}

function clamp(n: number, lo: number, hi: number): number {
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 50
}

// Back-compat for older callers that only need the size.
export function parseImageSize(title: string | null | undefined): ImageSize {
  return parseImageOpts(title).size
}

// Recursively pull plain text out of react-markdown's children.
function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (typeof node === 'object' && 'props' in (node as object)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = (node as any).props
    return textOf(props?.children)
  }
  return ''
}

// Strip a leading "PRO TIP: " (or similar) from whichever text child it
// appears in, then return the rebuilt children array. Preserves any
// inline markdown formatting that came after the token.
function stripLeadingToken(children: ReactNode): ReactNode {
  const arr = Array.isArray(children) ? [...children] : [children]
  for (let i = 0; i < arr.length; i++) {
    const c = arr[i]
    if (typeof c === 'string') {
      const m = c.match(/^\s*(?:PRO TIP|DISCOUNT|AVOID|HONEST TAKE)\s*:\s*([\s\S]*)$/i)
      if (m) {
        arr[i] = m[1]
        return arr
      }
      if (c.trim().length > 0) return arr
    } else if (c != null && c !== false) {
      // First non-string non-empty child without a token, stop.
      return arr
    }
  }
  return arr
}

export type ImageAnchor = { x: number; y: number }

// Build the components map. When onImageClick is provided we wire up
// click + visual highlight so the PDF builder can pop a size-picker.
// The anchor is the viewport-relative point we want the popover to
// open from (bottom-centre of the clicked image).
function buildComponents(onImageClick?: (src: string, anchor: ImageAnchor) => void): Components {
  return {
  // Detect callout patterns at the start of a paragraph.
  p({ children }) {
    const leadingText = textOf(children).slice(0, 60)
    const detected = detectCalloutFromText(leadingText)
    if (detected) {
      // Rebuild children with the leading token removed.
      const stripped = stripLeadingToken(children)
      return <Callout kind={detected.kind}>{stripped}</Callout>
    }
    return <p>{children}</p>
  },
  // Open external links in a new tab; internal links stay in-app.
  a({ href, children }) {
    const isExternal = typeof href === 'string' && /^https?:\/\//.test(href)
    return isExternal ? (
      <a href={href} target="_blank" rel="noreferrer noopener" className="text-brand-700 underline decoration-brand-300 hover:decoration-brand-700">
        {children}
      </a>
    ) : (
      <a href={href} className="text-brand-700 underline decoration-brand-300 hover:decoration-brand-700">{children}</a>
    )
  },
  table({ children }) {
    return (
      <div className="my-5 overflow-x-auto -mx-2 sm:mx-0">
        <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">{children}</table>
      </div>
    )
  },
  thead({ children }) { return <thead className="bg-gray-50 text-xs uppercase text-gray-500">{children}</thead> },
  th({ children })    { return <th className="px-3 py-2 text-left font-semibold border-b border-gray-200">{children}</th> },
  td({ children })    { return <td className="px-3 py-2 border-b border-gray-100 align-top">{children}</td> },
  // Images: read size/align/crop tokens from the title and turn them
  // into CSS classes that the print stylesheet uses to size and lay
  // out the picture. When onImageClick is set (builder mode), the
  // image is wrapped in a button that opens the option picker.
  img({ src, alt, title }) {
    if (typeof src !== 'string') return null
    const opts = parseImageOpts(title)
    const cls = `img-${opts.size} img-align-${opts.align} img-crop-${opts.crop}`
    // object-position only matters when there's something to crop/fit
    // around, but it's safe to always set — for object-fit: contain
    // (no crop) the image just sits at that position inside its box.
    const style: React.CSSProperties =
      (opts.focusX !== 50 || opts.focusY !== 50)
        ? { objectPosition: `${opts.focusX}% ${opts.focusY}%` }
        : {}
    const badge = [
      opts.size,
      opts.align !== 'center' ? opts.align : null,
      opts.crop !== 'none' ? opts.crop : null,
    ].filter(Boolean).join(' · ')
    if (onImageClick) {
      return (
        <button
          type="button"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            onImageClick(src, {
              x: rect.left + rect.width / 2,
              y: rect.bottom + 4,
            })
          }}
          className={`p-0 m-0 border-0 bg-transparent cursor-pointer relative group img-btn-align-${opts.align}`}
          aria-label={`Edit image ${alt ?? ''}`}
        >
          { /* eslint-disable-next-line @next/next/no-img-element */ }
          <img src={src} alt={alt ?? ''} title={title ?? undefined} style={style} className={`${cls} ring-2 ring-brand-200/60 hover:ring-brand-500 transition-shadow`} />
          <span className="absolute top-2 right-2 text-[10px] uppercase tracking-widest bg-brand-700 text-white px-2 py-0.5 rounded shadow-sm">
            {badge} · click to edit
          </span>
        </button>
      )
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt ?? ''} title={title ?? undefined} style={style} className={cls} />
  },
  }
}

// Default components (no image click handler).
const baseComponents = buildComponents()

export default function GuideMarkdown({
  markdown,
  autoLinkPhrases,
  onImageClick,
}: {
  markdown: string
  autoLinkPhrases?: AutoLinkPhrase[]
  // Builder mode: when provided, images become clickable so the
  // PDF builder can show a size picker. The anchor is the viewport-
  // relative point the popover should open from (bottom-centre of
  // the clicked image).
  onImageClick?: (src: string, anchor: ImageAnchor) => void
}) {
  const plugins = autoLinkPhrases && autoLinkPhrases.length > 0
    ? [remarkGfm, remarkAutoLink(autoLinkPhrases)]
    : [remarkGfm]
  const components = onImageClick ? buildComponents(onImageClick) : baseComponents
  return (
    <div className="prose prose-jft prose-lg max-w-none">
      <ReactMarkdown remarkPlugins={plugins} components={components}>
        {markdown || ''}
      </ReactMarkdown>
    </div>
  )
}
