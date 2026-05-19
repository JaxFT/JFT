'use client'

// Print-friendly render of a guide. Lives at /admin/guides/[id]/print.
//
// Layout:
//   - Page 1: full-bleed cover image with title + subtitle overlay
//             ("Jax | Family Travels" branding above the title)
//   - Page 2+: body with a page break before every ## heading,
//              tighter typography for paper, no paywall / no admin
//              chrome.
//   - Running header/footer: small title + page number on body pages.
//
// On load the print dialog opens automatically. The writer picks
// "Save as PDF" in their browser and we get a clean file out.
//
// Print-quality caveat (mentioned in the chat): desktop Chrome's
// output is noticeably better than Safari's or mobile browsers.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, ArrowLeft } from 'lucide-react'
import GuideMarkdown from './GuideMarkdown'
import type { GuideRow, GuideContentBlock } from '@/lib/guide-types'

type Props = { guide: GuideRow }

function blockBodyAsMarkdown(b: GuideContentBlock): string {
  const heading = b.heading.trim()
  const body = b.body.trim()
  return heading ? `## ${heading}\n\n${body}` : body
}

// For legacy block-based guides, join blocks into one markdown string
// so the page-break-before-h2 rule kicks in cleanly.
function fullMarkdown(guide: GuideRow): string {
  if (guide.body_markdown.trim()) return guide.body_markdown
  const blocks = (guide.sections.blocks ?? []).slice().sort((a, b) => a.order - b.order)
  return blocks.map(blockBodyAsMarkdown).join('\n\n')
}

export default function PrintView({ guide }: Props) {
  const router = useRouter()
  const markdown = fullMarkdown(guide)

  useEffect(() => {
    // Give the page a tick to render so the cover image has a chance
    // to load before the dialog opens, otherwise some browsers omit
    // it from the printed PDF.
    const t = setTimeout(() => { window.print() }, 500)
    return () => clearTimeout(t)
  }, [])

  // Escape title for CSS string content. Double-quotes are illegal
  // inside CSS string literals so we strip them.
  const safeTitle = guide.title.replace(/"/g, '”')

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* ── @page setup ─────────────────────────────────── */
        @page {
          size: A4;
          margin: 20mm 18mm 22mm 18mm;
          @top-center {
            content: "${safeTitle}";
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            font-size: 9pt;
            color: #8a8a82;
            letter-spacing: 0.08em;
          }
          @bottom-center {
            content: counter(page);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            font-size: 9pt;
            color: #8a8a82;
          }
        }
        @page :first {
          margin: 0;
          @top-center { content: none; }
          @bottom-center { content: none; }
        }

        /* ── Screen preview ──────────────────────────────── */
        body { background: #e9e7e3; }
        .print-page {
          background: white;
          width: 210mm;
          min-height: 297mm;
          margin: 20px auto;
          padding: 20mm 18mm;
          box-sizing: border-box;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .print-cover {
          background: #2D5240;
          color: white;
          padding: 0;
          margin: 0 auto 20px auto;
          width: 210mm;
          height: 297mm;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
        }
        .print-cover-image {
          flex: 1;
          min-height: 60%;
          /* contain (not cover) so the image is shown in full with
             green bands on whichever sides need them, instead of being
             cropped to fill the box. */
          object-fit: contain;
          width: 100%;
          display: block;
        }
        .print-cover-text {
          padding: 18mm 18mm 22mm 18mm;
          text-align: center;
          background: #2D5240;
        }
        .print-cover-eyebrow {
          font-size: 10pt;
          letter-spacing: 0.22em;
          font-weight: 700;
          text-transform: uppercase;
          color: rgba(255,255,255,0.6);
          margin-bottom: 16pt;
        }
        .print-cover-title {
          font-size: 28pt;
          font-weight: 800;
          line-height: 1.15;
          margin: 0 0 14pt 0;
          color: white;
        }
        .print-cover-subtitle {
          font-size: 13pt;
          line-height: 1.5;
          color: rgba(255,255,255,0.85);
          font-weight: 400;
          max-width: 130mm;
          margin: 0 auto;
        }
        .print-cover-tags {
          margin-top: 18pt;
          display: flex;
          flex-wrap: wrap;
          gap: 6pt;
          justify-content: center;
        }
        .print-cover-tag {
          font-size: 8.5pt;
          font-weight: 600;
          color: white;
          background: rgba(255,255,255,0.15);
          padding: 3pt 9pt;
          border-radius: 999px;
        }

        /* Body content styling, overrides prose-jft for paper */
        .print-body {
          font-family: Georgia, "Times New Roman", serif;
          color: #1a1a18;
          font-size: 11pt;
          line-height: 1.55;
        }
        /* H2 no longer forces a new page. Instead it stays with the
           next paragraph (break-after: avoid) so headings never end up
           orphaned at the bottom of a page, but short sections don't
           waste a page on blank space. If the writer DOES want a fresh
           page before a section, they can add a "---" horizontal rule
           in the markdown above it — see the .print-body hr rule
           further down. */
        .print-body h2 {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          font-size: 20pt;
          font-weight: 800;
          color: #2D5240;
          margin: 24pt 0 14pt 0;
          padding-bottom: 8pt;
          border-bottom: 1pt solid #2D5240;
          page-break-after: avoid;
          break-after: avoid;
        }
        .print-body h2:first-of-type { margin-top: 0; }
        .print-body h3 {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          font-size: 13pt;
          font-weight: 700;
          color: #1a1a18;
          margin: 16pt 0 8pt 0;
          page-break-after: avoid;
          break-after: avoid;
        }
        .print-body p { margin: 0 0 8pt 0; orphans: 3; widows: 3; }
        .print-body ul, .print-body ol { margin: 0 0 8pt 0; padding-left: 18pt; }
        .print-body li { margin-bottom: 4pt; orphans: 2; widows: 2; }
        .print-body strong { font-weight: 700; color: #1a1a18; }
        .print-body em { font-style: italic; }
        .print-body blockquote {
          margin: 10pt 0;
          padding: 0 0 0 14pt;
          border-left: 2pt solid #2D5240;
          color: #5a5a52;
          font-style: italic;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        /* Image sizing. The writer picks one of four sizes per image
           in the PDF builder; each maps to a max-height that gives a
           sensible amount of A4 real estate. Default (no size in the
           markdown image title) renders as "medium". */
        .print-body img {
          max-width: 100%;
          max-height: 100mm;
          width: auto;
          height: auto;
          display: block;
          margin: 12pt auto;
          page-break-inside: avoid;
          break-inside: avoid;
          object-fit: contain;
        }
        .print-body img.img-small  { max-height: 50mm; }
        .print-body img.img-medium { max-height: 100mm; }
        .print-body img.img-large  { max-height: 160mm; }
        .print-body img.img-full   { max-height: 230mm; }
        /* Alignment: when an image is floated, the surrounding text
           wraps around it. Float images keep a sensible max-width so
           the body copy still has room to flow. */
        .print-body img.img-align-center { margin: 12pt auto; }
        .print-body img.img-align-left {
          float: left;
          margin: 4pt 14pt 8pt 0;
          max-width: 55%;
        }
        .print-body img.img-align-right {
          float: right;
          margin: 4pt 0 8pt 14pt;
          max-width: 55%;
        }
        /* Crop: force a target aspect ratio + object-fit cover to
           crop the image to fit that ratio, rather than letting the
           natural ratio dictate the box. */
        .print-body img.img-crop-square { aspect-ratio: 1 / 1;  object-fit: cover; }
        .print-body img.img-crop-wide   { aspect-ratio: 16 / 9; object-fit: cover; }
        .print-body img.img-crop-tall   { aspect-ratio: 3 / 4;  object-fit: cover; }
        .print-body img.img-crop-square,
        .print-body img.img-crop-wide,
        .print-body img.img-crop-tall { width: auto; }
        /* Headings always clear any floated image above so a new
           section starts fresh on the page. */
        .print-body h2, .print-body h3 { clear: both; }
        /* Writer-controlled forced page break. A "---" in the markdown
           renders as <hr>; in print we treat it as an invisible page
           break, so the writer can manually steer the break wherever
           the automatic flow looks ugly. The horizontal rule itself
           doesn't render. */
        .print-body hr {
          visibility: hidden;
          height: 0;
          margin: 0;
          padding: 0;
          border: none;
          page-break-after: always;
          break-after: page;
        }
        .print-body a {
          color: #2D5240;
          text-decoration: underline;
          text-decoration-color: rgba(45,82,64,0.3);
        }
        /* Show full URL after links in print, readers can't click on paper. */
        @media print {
          .print-body a[href^="http"]:after {
            content: " (" attr(href) ")";
            font-size: 8pt;
            color: #888;
            word-break: break-all;
          }
        }
        .print-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 12pt 0;
          font-size: 10pt;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .print-body th, .print-body td {
          border: 0.5pt solid #d4d2cc;
          padding: 4pt 6pt;
          text-align: left;
          vertical-align: top;
        }
        .print-body th { background: #f5f4f1; font-weight: 700; }
        /* Callouts stay styled but printer-friendly */
        .print-body .callout {
          margin: 10pt 0;
          padding: 8pt 12pt;
          border-left: 3pt solid #2D5240;
          background: #f5f4f1;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* Screen-only toolbar at the top, hidden when printing */
        .print-toolbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: #1a1a18;
          color: white;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          font-size: 13px;
        }
        @media print {
          .print-toolbar { display: none !important; }
          body { background: white; }
          .print-page, .print-cover { box-shadow: none; margin: 0; }
        }
      `}} />

      <div className="print-toolbar">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white/10 hover:bg-white/20"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <span className="text-xs opacity-70">
          Print dialog should open automatically. Pick <strong>Save as PDF</strong>. Use desktop Chrome for the best result.
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-white text-black hover:bg-gray-200"
        >
          <Printer className="w-3.5 h-3.5" /> Print again
        </button>
      </div>

      {/* COVER PAGE */}
      <div className="print-cover">
        {guide.cover_image && (
          // crossOrigin keeps printable images consistent across browsers
          // eslint-disable-next-line @next/next/no-img-element
          <img className="print-cover-image" src={guide.cover_image} alt={guide.title} />
        )}
        <div className="print-cover-text">
          <div className="print-cover-eyebrow">Jax | Family Travels</div>
          <h1 className="print-cover-title">{guide.title}</h1>
          {guide.subtitle && <p className="print-cover-subtitle">{guide.subtitle}</p>}
          {guide.tags.length > 0 && (
            <div className="print-cover-tags">
              {guide.tags.map(t => <span key={t} className="print-cover-tag">{t}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="print-page print-body">
        <GuideMarkdown markdown={markdown} />
      </div>
    </>
  )
}
