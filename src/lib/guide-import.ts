// Parser that turns a long-form markdown guide doc (typically pasted
// from a Claude Chat conversation) into the blocks shape the rest of
// the site uses. Auto-classifies each block's kind by heading
// keywords so the writer's section-by-section work survives the import.

import type { GuideContentBlock, GuideBlockKind } from '@/lib/guide-types'
import { genLocalId } from '@/lib/guide-types'

export type ParsedImport = {
  blocks: GuideContentBlock[]
  warnings: string[]
}

// Split the doc on H2 boundaries. Anything before the first H2 is
// treated as the doc's intro block. H1 lines are stripped (the title
// comes from the form, not the doc) but anything else above the first
// H2 stays. Empty input gives an empty block list.
export function parseGuideMarkdown(markdown: string): ParsedImport {
  const warnings: string[] = []
  const raw = (markdown ?? '').replace(/\r\n/g, '\n').trim()
  if (!raw) return { blocks: [], warnings: ['Nothing to parse, the markdown was empty.'] }

  // Drop H1 lines entirely. The title lives on the guide row, not in the body.
  const noH1 = raw
    .split('\n')
    .filter(line => !/^#\s+\S/.test(line))
    .join('\n')
    .trim()

  // Split on H2 boundaries. The first element may be the pre-H2 intro
  // text (no heading attached), subsequent ones start with "Heading\nbody…".
  // We split on a regex that captures the heading so we can rebuild cleanly.
  const sections: Array<{ heading: string | null; body: string }> = []
  // Match "## " at line start, capture the heading line.
  const parts = noH1.split(/^##\s+(.+)$/m)
  // parts is [preH2Text, heading1, body1, heading2, body2, ...]
  const pre = (parts[0] ?? '').trim()
  if (pre.length > 0) {
    sections.push({ heading: null, body: pre })
  }
  for (let i = 1; i < parts.length; i += 2) {
    const heading = (parts[i] ?? '').trim()
    const body = (parts[i + 1] ?? '').trim()
    sections.push({ heading, body })
  }

  if (sections.length === 0) {
    return { blocks: [], warnings: ['No ## headings or text content found.'] }
  }

  // If the only section is the pre-H2 chunk, warn but still emit it.
  if (sections.length === 1 && sections[0].heading === null) {
    warnings.push('No ## headings found in the doc, the whole text was imported as a single intro block. Add ## headings to split it into separate sections.')
  }

  const blocks: GuideContentBlock[] = sections.map((s, i) => {
    const heading = s.heading ?? (i === 0 ? 'Introduction' : `Section ${i + 1}`)
    const kind = classifyKind(heading, i, sections.length)
    return {
      id: genLocalId(),
      kind,
      heading,
      body: s.body,
      freePreview: defaultFreePreview(kind),
      order: i,
    }
  })

  return { blocks, warnings }
}

// Heading-keyword classifier. Patterns are British-English-flavoured
// and match the headings the existing JFT guides actually use. Order
// matters, more specific patterns first.
export function classifyKind(
  heading: string,
  index: number,
  total: number,
): GuideBlockKind {
  const h = heading.toLowerCase().trim()

  // Closing, very specific phrases the last block usually uses.
  if (/(final thoughts?|wrap[- ]?up|conclusion|in closing|sign[- ]?off|until next time|farewell|goodbye)/.test(h)) {
    return 'closing'
  }

  // List, "25 things to do…", "Top 10…", "Best places…"
  if (/^\d+\s+(things|reasons|ways|places|tips|spots|reasons)\b/.test(h)) return 'list'
  if (/^(top|best)\s+\d+/.test(h)) return 'list'
  if (/(things to do|places to (eat|visit|stay)|top spots|best spots)/.test(h)) return 'list'

  // Intro, framing chapters that come early.
  if (/^(why|about|what to expect|introduction|intro|overview|before you go)/.test(h)) return 'intro'
  if (/(need to know|destination highlights|highlights|getting started)/.test(h)) return 'intro'

  // Position fallbacks if nothing matched
  if (index === 0) return 'intro'
  if (index === total - 1) return 'closing'

  // Everything else, themed is the safe default.
  // Could try to detect destination names (capital-cased, short) but
  // it's fuzzy; the writer can flip kind on the wizard's sections step.
  return 'themed'
}

function defaultFreePreview(kind: GuideBlockKind): boolean {
  return kind === 'intro'
}
