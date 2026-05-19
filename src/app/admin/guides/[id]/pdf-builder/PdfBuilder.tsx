'use client'

// PDF builder: live A4 preview alongside the markdown editor, with a
// click-to-resize popover on every image and a one-tap "insert page
// break" button. The writer iterates until the preview looks right,
// saves, then prints to PDF (existing /print route).

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Printer, Scissors, Loader2, Check, X,
} from 'lucide-react'
import GuideMarkdown, {
  type ImageAnchor,
  type ImageSize, type ImageAlign, type ImageCrop, type ImageOpts,
  parseImageOpts, DEFAULT_IMAGE_OPTS,
} from '@/components/guide/GuideMarkdown'

const PRINT_CSS = `
  /* Styles shared with PrintView so the live preview matches the
     actual printed output as closely as possible. */
  .pdf-page {
    background: white;
    width: 210mm;
    min-height: 297mm;
    margin: 16px auto;
    padding: 20mm 18mm;
    box-sizing: border-box;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    font-family: Georgia, "Times New Roman", serif;
    color: #1a1a18;
    font-size: 11pt;
    line-height: 1.55;
  }
  .pdf-cover {
    background: #2D5240;
    color: white;
    width: 210mm;
    height: 297mm;
    margin: 16px auto;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  }
  .pdf-cover-image {
    flex: 1;
    min-height: 60%;
    /* contain (not cover) so the full image shows with green bands on
       whichever sides need them, matching the web guide cover. */
    object-fit: contain;
    width: 100%;
    display: block;
  }
  .pdf-cover-text {
    padding: 18mm 18mm 22mm 18mm;
    text-align: center;
    background: #2D5240;
  }
  .pdf-cover-eyebrow {
    font-size: 10pt;
    letter-spacing: 0.22em;
    font-weight: 700;
    text-transform: uppercase;
    color: rgba(255,255,255,0.6);
    margin-bottom: 16pt;
  }
  .pdf-cover-title {
    font-size: 28pt;
    font-weight: 800;
    line-height: 1.15;
    margin: 0 0 14pt 0;
    color: white;
  }
  .pdf-cover-subtitle {
    font-size: 13pt;
    line-height: 1.5;
    color: rgba(255,255,255,0.85);
    font-weight: 400;
    max-width: 130mm;
    margin: 0 auto;
  }
  .pdf-cover-tags {
    margin-top: 18pt;
    display: flex;
    flex-wrap: wrap;
    gap: 6pt;
    justify-content: center;
  }
  .pdf-cover-tag {
    font-size: 8.5pt;
    font-weight: 600;
    color: white;
    background: rgba(255,255,255,0.15);
    padding: 3pt 9pt;
    border-radius: 999px;
  }
  .pdf-body h2 {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 20pt;
    font-weight: 800;
    color: #2D5240;
    margin: 24pt 0 14pt 0;
    padding-bottom: 8pt;
    border-bottom: 1pt solid #2D5240;
  }
  .pdf-body h2:first-of-type { margin-top: 0; }
  .pdf-body h3 {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 13pt;
    font-weight: 700;
    color: #1a1a18;
    margin: 16pt 0 8pt 0;
  }
  .pdf-body p { margin: 0 0 8pt 0; }
  .pdf-body ul, .pdf-body ol { margin: 0 0 8pt 0; padding-left: 18pt; }
  .pdf-body li { margin-bottom: 4pt; }
  .pdf-body strong { font-weight: 700; color: #1a1a18; }
  .pdf-body em { font-style: italic; }
  .pdf-body blockquote {
    margin: 10pt 0;
    padding: 0 0 0 14pt;
    border-left: 2pt solid #2D5240;
    color: #5a5a52;
    font-style: italic;
  }
  .pdf-body img {
    max-width: 100%;
    max-height: 100mm;
    width: auto;
    height: auto;
    display: block;
    margin: 12pt auto;
    object-fit: contain;
  }
  .pdf-body img.img-small  { max-height: 50mm; }
  .pdf-body img.img-medium { max-height: 100mm; }
  .pdf-body img.img-large  { max-height: 160mm; }
  .pdf-body img.img-full   { max-height: 230mm; }
  /* Alignment + float (text wraps next to off-centre images). */
  .pdf-body img.img-align-center { margin: 12pt auto; }
  .pdf-body img.img-align-left   { float: left;  margin: 4pt 14pt 8pt 0; max-width: 55%; }
  .pdf-body img.img-align-right  { float: right; margin: 4pt 0 8pt 14pt; max-width: 55%; }
  /* The image is wrapped in a <button> in builder mode. When the
     image inside the button is floated, the button itself must also
     float so the wrapping geometry is right. */
  .pdf-body .img-btn-align-left   { float: left;  margin: 4pt 14pt 8pt 0; max-width: 55%; display: block; }
  .pdf-body .img-btn-align-right  { float: right; margin: 4pt 0 8pt 14pt; max-width: 55%; display: block; }
  .pdf-body .img-btn-align-center { display: block; width: 100%; }
  .pdf-body .img-btn-align-left img,
  .pdf-body .img-btn-align-right img { float: none; margin: 0; max-width: 100%; }
  /* Crop / shape: force a fixed aspect ratio and cover-fit. */
  .pdf-body img.img-crop-square { aspect-ratio: 1 / 1;  object-fit: cover; }
  .pdf-body img.img-crop-wide   { aspect-ratio: 16 / 9; object-fit: cover; }
  .pdf-body img.img-crop-tall   { aspect-ratio: 3 / 4;  object-fit: cover; }
  .pdf-body img.img-crop-square,
  .pdf-body img.img-crop-wide,
  .pdf-body img.img-crop-tall { width: auto; }
  /* Clear floats at headings so each section starts on a fresh line. */
  .pdf-body h2, .pdf-body h3 { clear: both; }
  /* The preview splits the markdown by "---" into separate A4 pages,
     so any hr that ends up inside a chunk is treated as a normal
     horizontal rule (which in the actual print becomes the invisible
     page-break trick — see PrintView). */
  .pdf-body hr {
    border: none;
    border-top: 1pt solid #d8d3c8;
    margin: 16pt 0;
  }

  /* Between two chunks (manual page break the writer inserted). */
  .pdf-manual-break {
    width: 210mm;
    margin: -4px auto -4px auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #2D5240;
  }
  .pdf-manual-break .line {
    flex: 1;
    height: 0;
    border-top: 2px solid #2D5240;
  }
  .pdf-manual-break .pill {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    background: #2D5240;
    color: white;
    padding: 4px 12px;
    border-radius: 999px;
    white-space: nowrap;
  }

  /* The natural-pagination indicator drawn inside a chunk that is
     taller than one A4. Rough guide, not exact — the print engine
     may shift the break slightly to avoid splitting a paragraph. */
  .pdf-auto-break {
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
    border-top: 1.5px dashed #c8a85a;
    z-index: 5;
  }
  .pdf-auto-break .label {
    position: absolute;
    right: 12px;
    top: -10px;
    background: #fdf8ed;
    border: 1px solid #c8a85a;
    color: #8a6d22;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }
`

type Props = {
  guideId: string
  title: string
  subtitle: string | null
  coverImage: string | null
  tags: string[]
  initialMarkdown: string
}

export default function PdfBuilder({
  guideId, title, subtitle, coverImage, tags, initialMarkdown,
}: Props) {
  const router = useRouter()
  const [markdown, setMarkdown] = useState(initialMarkdown)
  const [savedMarkdown, setSavedMarkdown] = useState(initialMarkdown)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [popover, setPopover] = useState<{ src: string; x: number; y: number } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const dirty = markdown !== savedMarkdown

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/guides/${guideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_markdown: markdown }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setSavedMarkdown(markdown)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  // Insert a "---" page break at the textarea cursor.
  const insertPageBreak = () => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart ?? markdown.length
    const end = ta.selectionEnd ?? markdown.length
    const prefix = markdown.slice(0, start)
    const suffix = markdown.slice(end)
    // Add surrounding blank lines if there aren't already
    const before = prefix.endsWith('\n\n') ? '' : prefix.endsWith('\n') ? '\n' : '\n\n'
    const after = suffix.startsWith('\n\n') ? '' : suffix.startsWith('\n') ? '\n' : '\n\n'
    const next = `${prefix}${before}---${after}${suffix}`
    setMarkdown(next)
    // Move cursor just past the inserted break.
    setTimeout(() => {
      ta.focus()
      const pos = (prefix + before + '---').length
      ta.setSelectionRange(pos, pos)
    }, 0)
  }

  // Image click handler: open the size popover anchored just below the
  // clicked image. The popover sits inside a `fixed inset-0` overlay so
  // its inner `top/left` are viewport-relative — we feed it the click's
  // viewport coords (from getBoundingClientRect in the GuideMarkdown img
  // button) so it always lands in the visible area regardless of scroll.
  const onImageClick = (src: string, anchor: ImageAnchor) => {
    setPopover({ src, x: anchor.x, y: anchor.y })
  }

  // Read the current opts for the image the popover is attached to,
  // so the buttons can show which one is active per axis.
  const currentOpts: ImageOpts = useMemo(() => {
    if (!popover) return { ...DEFAULT_IMAGE_OPTS }
    return readOpts(markdown, popover.src)
  }, [popover, markdown])

  const setOpt = <K extends keyof ImageOpts>(key: K, value: ImageOpts[K]) => {
    if (!popover) return
    setMarkdown(setImageOpt(markdown, popover.src, key, value))
  }

  const resetOpts = () => {
    if (!popover) return
    setMarkdown(clearImageOpts(markdown, popover.src))
    setPopover(null)
  }

  // Split the markdown into one chunk per manual page break ("---" on
  // its own line). Each chunk renders as a separate A4 sheet so the
  // writer sees exactly which content lands on which page. Empty
  // chunks (between consecutive breaks) are dropped.
  const chunks = useMemo(() => {
    const parts = markdown.split(/^[ \t]*---[ \t]*$/m).map(c => c.trim())
    const filtered = parts.filter(c => c.length > 0)
    return filtered.length > 0 ? filtered : ['']
  }, [markdown])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* TOOLBAR */}
      <div className="sticky top-0 z-30 bg-gray-900 text-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-3 min-w-0">
            <Link href={`/admin/guides/draft?id=${guideId}`} className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <div className="text-sm font-semibold truncate">{title}</div>
            {dirty && <span className="text-xs text-amber-300">Unsaved changes</span>}
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={insertPageBreak}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 px-3 py-2 rounded-md"
              title="Insert a forced page break at the cursor"
            >
              <Scissors className="w-3.5 h-3.5" /> Insert page break
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-brand-600 hover:bg-brand-700 px-3 py-2 rounded-md disabled:opacity-60"
            >
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                : <><Save className="w-3.5 h-3.5" /> Save</>}
            </button>
            <Link
              href={`/admin/guides/${guideId}/print`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-gray-900 hover:bg-gray-200 px-3 py-2 rounded-md"
            >
              <Printer className="w-3.5 h-3.5" /> Print to PDF
            </Link>
          </div>
        </div>
        {error && (
          <div className="bg-red-900/40 border-t border-red-700/40 text-red-100 text-xs px-4 py-2">{error}</div>
        )}
      </div>

      {/* SPLIT VIEW */}
      <div className="bg-[#e9e7e3] min-h-screen">
        <div className="max-w-screen-2xl mx-auto grid lg:grid-cols-[40%_60%] gap-0">
          {/* EDITOR */}
          <div className="bg-white border-r border-gray-200 p-4">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Markdown</p>
              <p className="text-[10px] text-gray-400">
                Use <code className="font-mono bg-gray-100 px-1 rounded">---</code> for a page break · tap an image in the preview to resize
              </p>
            </div>
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={e => setMarkdown(e.target.value)}
              rows={40}
              spellCheck={false}
              className="w-full font-mono text-xs leading-relaxed text-gray-800 bg-gray-50 border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-y"
              style={{ minHeight: 'calc(100dvh - 140px)' }}
            />
          </div>

          {/* PREVIEW */}
          <div className="overflow-x-auto py-4">
            <div className="origin-top-left mx-auto" style={{ width: 'fit-content' }}>
              {/* COVER */}
              <div className="pdf-cover">
                {coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="pdf-cover-image" src={coverImage} alt={title} />
                )}
                <div className="pdf-cover-text">
                  <div className="pdf-cover-eyebrow">Jax | Family Travels</div>
                  <h1 className="pdf-cover-title">{title}</h1>
                  {subtitle && <p className="pdf-cover-subtitle">{subtitle}</p>}
                  {tags.length > 0 && (
                    <div className="pdf-cover-tags">
                      {tags.map(t => <span key={t} className="pdf-cover-tag">{t}</span>)}
                    </div>
                  )}
                </div>
              </div>

              {/* BODY — one A4 sheet per "---" chunk, with auto-break
                  guides inside any chunk that overflows a single page. */}
              {chunks.map((chunk, i) => (
                <div key={i}>
                  {i > 0 && (
                    <div className="pdf-manual-break" aria-hidden>
                      <span className="line" />
                      <span className="pill">Manual page break</span>
                      <span className="line" />
                    </div>
                  )}
                  <ChunkPage markdown={chunk} onImageClick={onImageClick} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* IMAGE OPTIONS POPOVER. Anchored to the click point (viewport
          coords), clamped to stay in the visible area. */}
      {popover && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setPopover(null)}
        >
          <div
            className="absolute bg-white rounded-2xl shadow-2xl border border-gray-200 p-3"
            style={{
              left: Math.max(8, Math.min(popover.x - 170, window.innerWidth - 348)),
              top: Math.max(8, Math.min(popover.y, window.innerHeight - 340)),
              width: 340,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Image options</p>
              <button onClick={() => setPopover(null)} className="text-gray-400 hover:text-gray-700 p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <OptRow
              label="Size"
              values={SIZES}
              current={currentOpts.size}
              onPick={v => setOpt('size', v)}
            />
            <OptRow
              label="Position on page"
              values={ALIGNS}
              current={currentOpts.align}
              onPick={v => setOpt('align', v)}
              hint="Left/Right makes text wrap around the image."
            />
            <OptRow
              label="Shape / crop"
              values={CROPS}
              current={currentOpts.crop}
              onPick={v => setOpt('crop', v)}
              hint="Crops the image to fit the chosen aspect ratio."
            />

            <button
              type="button"
              onClick={resetOpts}
              className="w-full mt-2 text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-700 py-1.5"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// One A4 sheet for a single chunk of body markdown. If the chunk's
// content is taller than one A4's content area, draws a dashed
// "auto break" line at each natural-page boundary inside the sheet
// so the writer can see roughly where Chrome's print engine is
// going to split the page — and add a manual "---" break (or resize
// an image) if the auto split happens somewhere ugly.
function ChunkPage({
  markdown,
  onImageClick,
}: {
  markdown: string
  onImageClick: (src: string, anchor: ImageAnchor) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [autoBreaks, setAutoBreaks] = useState<number[]>([])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const compute = () => {
      // 1mm = 96/25.4 px at 96 DPI (screen baseline). The actual print
      // engine uses its own DPI, but this is close enough for a rough
      // guide line.
      const pxPerMm = 96 / 25.4
      const pageTotalPx = 297 * pxPerMm
      const padPx = 20 * pxPerMm
      const contentAreaPx = pageTotalPx - 2 * padPx
      const totalH = el.scrollHeight
      const innerH = totalH - 2 * padPx
      const lines: number[] = []
      let pos = contentAreaPx
      while (pos < innerH - 4) {
        lines.push(padPx + pos)
        pos += contentAreaPx
      }
      setAutoBreaks(lines)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [markdown])

  return (
    <div ref={ref} className="pdf-page pdf-body" style={{ position: 'relative' }}>
      <GuideMarkdown markdown={markdown} onImageClick={onImageClick} />
      {autoBreaks.map((y, i) => (
        <div key={i} className="pdf-auto-break" style={{ top: y }}>
          <span className="label">Page would break here</span>
        </div>
      ))}
    </div>
  )
}

// Friendly labels for the option rows.
const SIZES: { value: ImageSize; label: string }[] = [
  { value: 'small',  label: 'Small'  },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large'  },
  { value: 'full',   label: 'Full'   },
]
const ALIGNS: { value: ImageAlign; label: string }[] = [
  { value: 'center', label: 'Centre' },
  { value: 'left',   label: 'Left'   },
  { value: 'right',  label: 'Right'  },
]
const CROPS: { value: ImageCrop; label: string }[] = [
  { value: 'none',   label: 'Free'   },
  { value: 'square', label: 'Square' },
  { value: 'wide',   label: 'Wide'   },
  { value: 'tall',   label: 'Tall'   },
]

function OptRow<V extends string>({
  label, hint, values, current, onPick,
}: {
  label: string
  hint?: string
  values: { value: V; label: string }[]
  current: V
  onPick: (v: V) => void
}) {
  return (
    <div className="mt-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">{label}</p>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
        {values.map(v => {
          const active = v.value === current
          return (
            <button
              key={v.value}
              type="button"
              onClick={() => onPick(v.value)}
              className={`inline-flex items-center justify-center gap-1 text-xs font-semibold px-2 py-2 rounded-md transition-colors ${
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-brand-50 hover:text-brand-700'
              }`}
              aria-pressed={active}
            >
              {active && <Check className="w-3 h-3" />} {v.label}
            </button>
          )
        })}
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-1 leading-snug">{hint}</p>}
    </div>
  )
}

const IMG_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g

// Strip the size/align/crop tokens from a title, returning anything
// else the writer typed (eg. a caption) so we don't destroy it.
function stripOptTokens(title: string | undefined | null): string {
  if (!title) return ''
  return title
    .replace(/\bsize\s*[:=]\s*\w+/gi, '')
    .replace(/\balign\s*[:=]\s*\w+/gi, '')
    .replace(/\bcrop\s*[:=]\s*\w+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Build a title string from opts + any preserved caption. Defaults
// are omitted to keep markdown clean.
function buildTitle(opts: ImageOpts, caption: string): string {
  const parts: string[] = []
  if (opts.size !== 'medium') parts.push(`size:${opts.size}`)
  if (opts.align !== 'center') parts.push(`align:${opts.align}`)
  if (opts.crop !== 'none') parts.push(`crop:${opts.crop}`)
  if (caption) parts.push(caption)
  return parts.join(' ')
}

// Read the current opts for an image src out of the markdown.
function readOpts(markdown: string, src: string): ImageOpts {
  const re = new RegExp(IMG_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(markdown)) !== null) {
    if (m[2] === src) return parseImageOpts(m[3] ?? null)
  }
  return { ...DEFAULT_IMAGE_OPTS }
}

// Set a single option (size / align / crop) on a specific image,
// preserving any non-opt caption text in the title.
function setImageOpt<K extends keyof ImageOpts>(
  markdown: string,
  src: string,
  key: K,
  value: ImageOpts[K],
): string {
  return markdown.replace(IMG_RE, (full, alt: string, mdSrc: string, title?: string) => {
    if (mdSrc !== src) return full
    const opts = parseImageOpts(title)
    opts[key] = value
    const caption = stripOptTokens(title)
    const newTitle = buildTitle(opts, caption)
    return newTitle
      ? `![${alt}](${mdSrc} "${newTitle}")`
      : `![${alt}](${mdSrc})`
  })
}

// Drop all opts from an image (revert to defaults), preserving any
// caption the writer added.
function clearImageOpts(markdown: string, src: string): string {
  return markdown.replace(IMG_RE, (full, alt: string, mdSrc: string, title?: string) => {
    if (mdSrc !== src) return full
    const caption = stripOptTokens(title)
    return caption
      ? `![${alt}](${mdSrc} "${caption}")`
      : `![${alt}](${mdSrc})`
  })
}
