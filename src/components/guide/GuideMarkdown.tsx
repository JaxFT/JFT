import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkAutoLink, type AutoLinkPhrase } from '@/lib/blog-links'
import { Callout, detectCalloutFromText } from './Callout'
import type { ReactNode } from 'react'

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

const baseComponents: Components = {
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
}

export default function GuideMarkdown({
  markdown,
  autoLinkPhrases,
}: {
  markdown: string
  autoLinkPhrases?: AutoLinkPhrase[]
}) {
  const plugins = autoLinkPhrases && autoLinkPhrases.length > 0
    ? [remarkGfm, remarkAutoLink(autoLinkPhrases)]
    : [remarkGfm]
  return (
    <div className="prose prose-jft prose-lg max-w-none">
      <ReactMarkdown remarkPlugins={plugins} components={baseComponents}>
        {markdown || ''}
      </ReactMarkdown>
    </div>
  )
}
