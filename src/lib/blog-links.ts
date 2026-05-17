// Client-safe shared types + remark plugin. The server-side
// getAutoLinkPhrases() lives in blog-links-server.ts so this file
// stays free of any `next/headers` / Supabase server imports and can
// be pulled into client components.

export type AutoLinkPhrase = { phrase: string; url: string }

// ─── remark plugin ────────────────────────────────────────────────
// Walks the mdast tree, finds plain-text occurrences of any registered
// phrase, and replaces the FIRST occurrence per phrase per post with a
// markdown link. Skips text inside existing links, inline code, and
// code blocks so we never double-link or break code samples.

type MdastNode = {
  type: string
  value?: string
  url?: string
  children?: MdastNode[]
  [k: string]: unknown
}

const SKIP_PARENT_TYPES = new Set(['link', 'linkReference', 'inlineCode', 'code'])

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function remarkAutoLink(phrases: AutoLinkPhrase[]) {
  // Longest first so multi-word phrases beat their substrings.
  const sorted = [...phrases]
    .filter(p => p.phrase.trim().length > 0)
    .sort((a, b) => b.phrase.length - a.phrase.length)

  if (sorted.length === 0) {
    // unified expects a transformer; return a no-op.
    return () => (_tree: MdastNode) => {}
  }

  const lookup = new Map<string, string>()
  for (const p of sorted) lookup.set(p.phrase.toLowerCase(), p.url)

  const pattern = sorted.map(p => escapeForRegex(p.phrase)).join('|')
  // \b on both sides; case-insensitive. New regex per transform run
  // because `lastIndex` is mutated.
  const buildRegex = () => new RegExp(`\\b(?:${pattern})\\b`, 'gi')

  return () => (tree: MdastNode) => {
    const seenInPost = new Set<string>()
    const regex = buildRegex()

    function transformChildren(parent: MdastNode) {
      if (!parent.children) return
      if (SKIP_PARENT_TYPES.has(parent.type)) return

      for (let i = 0; i < parent.children.length; i++) {
        const child = parent.children[i]
        if (SKIP_PARENT_TYPES.has(child.type)) continue

        if (child.type === 'text' && typeof child.value === 'string') {
          const replaced = transformText(child.value)
          if (replaced) {
            parent.children.splice(i, 1, ...replaced)
            i += replaced.length - 1
          }
        } else {
          transformChildren(child)
        }
      }
    }

    function transformText(text: string): MdastNode[] | null {
      regex.lastIndex = 0
      const parts: MdastNode[] = []
      let lastIndex = 0
      let matched = false
      let m: RegExpExecArray | null

      while ((m = regex.exec(text)) !== null) {
        const phrase = m[0]
        const key = phrase.toLowerCase()
        if (seenInPost.has(key)) continue
        seenInPost.add(key)
        const url = lookup.get(key)
        if (!url) continue

        matched = true
        if (m.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, m.index) })
        }
        parts.push({
          type: 'link',
          url,
          title: null,
          children: [{ type: 'text', value: phrase }],
        })
        lastIndex = m.index + phrase.length
      }

      if (!matched) return null
      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) })
      }
      return parts
    }

    transformChildren(tree)
  }
}
