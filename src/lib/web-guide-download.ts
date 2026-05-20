// Render a web guide as a single self-contained HTML file for the
// offline-download flow. No external CSS, no external fonts, no JS —
// the buyer can open the file in any browser on any device and read
// it without an internet connection.
//
// Body images stay as URLs (Supabase storage / external) so the file
// stays a sensible size; offline buyers will see broken image icons
// on the body images but the cover (which is embedded as base64) and
// all the text render. Good enough for v1, full embedding is a later
// add if a buyer asks.

import { marked } from 'marked'
import type { GuideRow } from '@/lib/guide-types'

// Marked is fine on Cloudflare/Node and tiny. We disable mangle and
// headerIds because we don't need the link-anchor noise.
marked.setOptions({ gfm: true, breaks: false })

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    const ct = r.headers.get('content-type') ?? 'image/jpeg'
    const buf = await r.arrayBuffer()
    // btoa on Uint8Array via a chunked loop — Cloudflare workers don't
    // give us Buffer, and the spread-into-fromCharCode trick blows the
    // stack on big files.
    const bytes = new Uint8Array(buf)
    let s = ''
    const CHUNK = 0x8000
    for (let i = 0; i < bytes.length; i += CHUNK) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[])
    }
    return `data:${ct};base64,${btoa(s)}`
  } catch {
    return null
  }
}

// Walk every <img src="…"> in the rendered HTML and replace remote
// URLs with inline base64 data URIs. Lets the downloaded file open
// fully offline (or from a file:// path where Supabase signed URLs
// would 401, or where CORS would block the load). Fetches run in
// parallel; any image that fails to download stays as its original
// URL so an online viewer at least sees something.
async function inlineRemoteImages(html: string): Promise<string> {
  const urls = new Set<string>()
  const re = /<img\b[^>]*?\bsrc=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const src = m[1]
    if (/^(?:https?:)?\/\//i.test(src)) urls.add(src)
  }
  if (urls.size === 0) return html

  const replacements = await Promise.all(
    Array.from(urls).map(async u => [u, await fetchAsDataUri(u)] as const),
  )

  let out = html
  for (const [u, data] of replacements) {
    if (!data) continue
    // Escape special regex chars before splitting on the URL string.
    out = out.split(u).join(data)
  }
  return out
}

const STYLES = `
  :root {
    color-scheme: light;
    --ink: #1a2826;
    --ink-soft: #4b5e5a;
    --line: #e3ebe6;
    --brand: #2d8163;
    --brand-soft: #f0f7f3;
    --paper: #fafaf7;
    --max-width: 720px;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.65;
    font-size: 17px;
    -webkit-font-smoothing: antialiased;
  }
  main {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 32px 24px 80px;
  }
  .cover {
    margin: 0 -24px 32px;
    border-radius: 12px;
    overflow: hidden;
    background: #e9efe9;
  }
  .cover img { width: 100%; display: block; }
  h1 {
    font-size: 2.1rem;
    line-height: 1.2;
    margin: 0 0 10px;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .subtitle {
    color: var(--ink-soft);
    font-size: 1.05rem;
    line-height: 1.5;
    margin: 0 0 28px;
  }
  .meta {
    color: var(--ink-soft);
    font-size: 0.85rem;
    margin: 0 0 32px;
    padding: 12px 16px;
    background: var(--brand-soft);
    border-left: 3px solid var(--brand);
    border-radius: 4px;
  }
  hr {
    border: none;
    border-top: 1px solid var(--line);
    margin: 36px 0;
  }
  h2 {
    font-size: 1.5rem;
    line-height: 1.3;
    margin: 40px 0 14px;
    color: var(--ink);
    letter-spacing: -0.005em;
  }
  h3 {
    font-size: 1.2rem;
    line-height: 1.35;
    margin: 28px 0 10px;
    color: var(--ink);
  }
  p { margin: 0 0 16px; }
  ul, ol { margin: 0 0 18px; padding-left: 1.4em; }
  li { margin: 0 0 8px; }
  a { color: var(--brand); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }
  blockquote {
    margin: 20px 0;
    padding: 14px 18px;
    border-left: 3px solid var(--brand);
    background: var(--brand-soft);
    color: var(--ink);
    border-radius: 4px;
  }
  blockquote p:last-child { margin-bottom: 0; }
  img { max-width: 100%; height: auto; display: block; border-radius: 8px; margin: 20px auto; }
  table {
    width: 100%;
    max-width: 100%;
    border-collapse: collapse;
    margin: 0 0 22px;
    font-size: 0.95em;
    table-layout: auto;
  }
  th, td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
    word-break: break-word;
  }
  th {
    font-weight: 600;
    background: var(--brand-soft);
    color: var(--ink);
    border-bottom: 2px solid var(--brand);
  }
  tbody tr:last-child td { border-bottom: none; }
  code {
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 0.92em;
    background: #eef3ee;
    padding: 2px 6px;
    border-radius: 3px;
  }
  pre {
    background: #1a2826;
    color: #e0e9e5;
    padding: 16px;
    border-radius: 8px;
    overflow: auto;
    margin: 0 0 18px;
  }
  pre code { background: transparent; color: inherit; padding: 0; }
  .watermark {
    margin: 80px -24px 0;
    padding: 24px;
    border-top: 1px solid var(--line);
    text-align: center;
    color: var(--ink-soft);
    font-size: 0.8rem;
    line-height: 1.55;
  }
  .watermark strong { color: var(--ink); }
  .watermark a { color: var(--ink-soft); }
  @media print {
    body { background: white; }
    main { padding: 0; }
  }
`

export async function renderGuideHtml(
  guide: GuideRow,
  buyerEmail: string | null,
): Promise<string> {
  // Cover image: fetch + base64 once at render time so the file is
  // self-contained for offline viewing.
  let coverImgTag = ''
  if (guide.cover_image) {
    const dataUri = await fetchAsDataUri(guide.cover_image)
    if (dataUri) {
      coverImgTag = `<div class="cover"><img src="${dataUri}" alt="${escapeHtml(guide.title)} cover"></div>`
    }
  }

  // Compose the markdown: intro + body, with a divider between them.
  // Use whatever the guide actually has — intro and body are both
  // optional in the schema.
  const parts: string[] = []
  if (guide.intro_markdown.trim()) parts.push(guide.intro_markdown.trim())
  if (guide.body_markdown.trim()) parts.push(guide.body_markdown.trim())
  // If the guide is on the legacy block model with no body_markdown,
  // fall back to concatenating block bodies in order. New guides use
  // body_markdown so this is just defensive for old rows.
  if (parts.length === 0 && guide.sections.blocks?.length) {
    const ordered = [...guide.sections.blocks].sort((a, b) => a.order - b.order)
    for (const b of ordered) {
      parts.push(`## ${b.heading}\n\n${b.body}`)
    }
  }
  const fullMarkdown = parts.join('\n\n---\n\n')
  const rawBodyHtml = await marked.parse(fullMarkdown)
  // Pull every body image down and embed it base64 so the file is
  // truly self-contained — opens correctly from Downloads on any
  // device, even with no internet.
  const bodyHtml = await inlineRemoteImages(rawBodyHtml)

  const watermark = buyerEmail
    ? `<div class="watermark">Personal copy purchased by <strong>${escapeHtml(buyerEmail)}</strong> · <a href="https://jaxfamilytravels.com">jaxfamilytravels.com</a></div>`
    : `<div class="watermark"><a href="https://jaxfamilytravels.com">jaxfamilytravels.com</a></div>`

  const title = escapeHtml(guide.title)
  const subtitle = guide.subtitle ? `<p class="subtitle">${escapeHtml(guide.subtitle)}</p>` : ''
  const purchasedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const purchaseLine = buyerEmail
    ? `<p class="meta">Downloaded ${escapeHtml(purchasedAt)} · Your personal offline copy.</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>${STYLES}</style>
</head>
<body>
<main>
${coverImgTag}
<h1>${title}</h1>
${subtitle}
${purchaseLine}
${bodyHtml}
${watermark}
</main>
</body>
</html>`
}

// Safe filename for the download. ASCII only — some mail clients mangle
// non-ASCII in Content-Disposition.
export function downloadFilenameFor(guide: GuideRow): string {
  const safe = guide.slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  return `${safe || 'guide'}.html`
}
