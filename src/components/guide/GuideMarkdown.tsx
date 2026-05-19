import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkAutoLink, type AutoLinkPhrase } from '@/lib/blog-links'
import { Callout, detectCalloutFromText } from './Callout'
import type { ReactNode } from 'react'

export type ImageSize = 'small' | 'medium' | 'large' | 'full'

// Read a "size:X" attribute out of a markdown image title:
// ![alt](url "size:large") → 'large'.
// Falls back to 'medium' (default) when nothing is set.
export function parseImageSize(title: string | null | undefined): ImageSize {
  if (!title) return 'medium'
  const m = title.match(/size\s*[:=]\s*(small|medium|large|full)/i)
  return (m?.[1].toLowerCase() ?? 'medium') as ImageSize
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

// Build the components map. When onImageClick is provided we wire up
// click + visual highlight so the PDF builder can pop a size-picker.
function buildComponents(onImageClick?: (src: string) => void): Components {
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
  // Images: read "size:X" from the title attribute and apply a
  // matching class so the print CSS can constrain max-height. When
  // onImageClick is set (builder mode), the image is wrapped in a
  // button that opens the size picker for that specific image.
  img({ src, alt, title }) {
    if (typeof src !== 'string') return null
    const size = parseImageSize(title)
    const cls = `img-${size}`
    if (onImageClick) {
      return (
        <button
          type="button"
          onClick={() => onImageClick(src)}
          className="block w-full p-0 m-0 border-0 bg-transparent cursor-pointer relative group"
          aria-label={`Resize image ${alt ?? ''}`}
        >
          { /* eslint-disable-next-line @next/next/no-img-element */ }
          <img src={src} alt={alt ?? ''} title={title ?? undefined} className={`${cls} ring-2 ring-transparent group-hover:ring-brand-300 transition-shadow`} />
          <span className="absolute top-2 right-2 text-[10px] uppercase tracking-widest bg-brand-700 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {size}
          </span>
        </button>
      )
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt ?? ''} title={title ?? undefined} className={cls} />
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
  // PDF builder can show a size picker.
  onImageClick?: (src: string) => void
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
