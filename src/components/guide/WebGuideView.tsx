import Link from 'next/link'
import { ArrowLeft, ArrowRight, Crown, Lock, Map, ListOrdered } from 'lucide-react'
import GuideMarkdown from './GuideMarkdown'
import type { GuideRow, GuideContentBlock } from '@/lib/guide-types'
import { truncateMarkdownToPercent, extractMarkdownToc } from '@/lib/guide-types'
import type { AutoLinkPhrase } from '@/lib/blog-links'

type Props = {
  guide: GuideRow
  aboutUsMarkdown: string
  autoLinkPhrases: AutoLinkPhrase[]
  canViewFull: boolean
  isLoggedIn: boolean
  isPremium: boolean
}

function anchor(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60)
}

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

function blockAnchor(b: GuideContentBlock): string {
  const h = anchor(b.heading) || 'section'
  return `block-${h}-${b.id.slice(0, 6)}`
}

export default function WebGuideView({
  guide, aboutUsMarkdown, autoLinkPhrases, canViewFull, isLoggedIn, isPremium,
}: Props) {
  const hideAbout = !!guide.sections.hideAbout
  const useSingleDoc = guide.body_markdown.trim().length > 0

  return (
    <div className="min-h-screen bg-sand-50 pb-20">
      {/* COVER HERO */}
      <div className="relative bg-brand-950 text-white">
        {guide.cover_image ? (
          <div className="relative w-full max-w-3xl mx-auto pt-20">
            <img
              src={guide.cover_image}
              alt={guide.title}
              decoding="async"
              fetchPriority="high"
              className="block w-full max-h-[80vh] object-contain bg-brand-900"
            />
          </div>
        ) : (
          <div className="w-full max-w-3xl mx-auto pt-20 aspect-[3/4] flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900">
            <Map className="w-20 h-20 text-white/40" />
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-5">
            <ArrowLeft className="w-4 h-4" /> All guides
          </Link>
          {guide.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {guide.tags.map(tag => (
                <span key={tag} className="text-xs font-semibold text-white bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{guide.title}</h1>
          {guide.subtitle && <p className="text-lg text-white/80 mt-3 leading-relaxed">{guide.subtitle}</p>}

          <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
            {canViewFull ? (
              isPremium ? (
                <><Crown className="w-3.5 h-3.5 text-brand-300" /> Premium access</>
              ) : (
                <><Crown className="w-3.5 h-3.5 text-brand-300" /> Full guide</>
              )
            ) : (
              <><Lock className="w-3.5 h-3.5 text-amber-200" /> Preview — first {guide.preview_percent}% shown</>
            )}
          </div>
        </div>
      </div>

      {guide.intro_markdown.trim() && (
        <IntroSection markdown={guide.intro_markdown} autoLinkPhrases={autoLinkPhrases} />
      )}

      {useSingleDoc
        ? (
          <SingleDocBody
            guide={guide}
            aboutUsMarkdown={aboutUsMarkdown}
            autoLinkPhrases={autoLinkPhrases}
            canViewFull={canViewFull}
            isLoggedIn={isLoggedIn}
            hideAbout={hideAbout}
          />
        )
        : (
          <BlocksBody
            guide={guide}
            aboutUsMarkdown={aboutUsMarkdown}
            autoLinkPhrases={autoLinkPhrases}
            canViewFull={canViewFull}
            isLoggedIn={isLoggedIn}
            hideAbout={hideAbout}
          />
        )}
    </div>
  )
}

// Subtle card between the cover and TOC for short editorial updates
// from the authors ("we've been back twice and added new sections on
// Tangalle and the east coast"). Hidden when the intro is empty.
function IntroSection({ markdown, autoLinkPhrases }: { markdown: string; autoLinkPhrases: AutoLinkPhrase[] }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 sm:px-6 sm:py-5">
        <GuideMarkdown markdown={markdown} autoLinkPhrases={autoLinkPhrases} />
      </div>
    </div>
  )
}

// ─── SINGLE-DOC RENDER ────────────────────────────────────────────
// New default: render guide.body_markdown as one continuous doc with
// an auto-built TOC from H2 headings and a percentage-based paywall.
function SingleDocBody({
  guide, aboutUsMarkdown, autoLinkPhrases, canViewFull, isLoggedIn, hideAbout,
}: {
  guide: GuideRow
  aboutUsMarkdown: string
  autoLinkPhrases: AutoLinkPhrase[]
  canViewFull: boolean
  isLoggedIn: boolean
  hideAbout: boolean
}) {
  const fullMd = guide.body_markdown
  const visibleMd = canViewFull
    ? fullMd
    : truncateMarkdownToPercent(fullMd, Math.max(5, guide.preview_percent))
  const gated = !canViewFull && visibleMd.length < fullMd.length

  // TOC from H2 headings actually present in the VISIBLE markdown.
  const toc = extractMarkdownToc(visibleMd)
  if (aboutUsMarkdown.trim() && !hideAbout) toc.unshift({ id: 'about-us', label: 'About us' })

  return (
    <>
      {toc.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-10">
          <details className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <summary className="cursor-pointer px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50">
              <span className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-brand-700">
                <ListOrdered className="w-4 h-4" /> Table of contents
              </span>
              <span className="text-xs text-gray-400 font-medium">{toc.length} sections</span>
            </summary>
            <ol className="border-t border-gray-100 divide-y divide-gray-100">
              {toc.map((entry, i) => (
                <li key={entry.id}>
                  <a href={`#${entry.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-900">
                    <span className="font-medium truncate">
                      <span className="text-gray-400 font-mono text-xs mr-2 tabular-nums">{(i + 1).toString().padStart(2, '0')}</span>
                      {entry.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  </a>
                </li>
              ))}
            </ol>
          </details>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-12">
        {aboutUsMarkdown.trim() && !hideAbout && (
          <section id="about-us" className="scroll-mt-24 mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-5 pb-3 border-b border-gray-200">About us</h2>
            <GuideMarkdown markdown={aboutUsMarkdown} autoLinkPhrases={autoLinkPhrases} />
          </section>
        )}

        <div className="relative">
          <GuideMarkdown markdown={visibleMd} autoLinkPhrases={autoLinkPhrases} />
          {gated && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-sand-50/0 to-sand-50" />
          )}
        </div>

        {gated && (
          <Paywall
            isLoggedIn={isLoggedIn}
            slug={guide.slug}
            hiddenLabel={`${100 - guide.preview_percent}% more`}
            hasOneOff={guide.price_pence > 0}
            priceLabel={formatPrice(guide.price_pence)}
          />
        )}
      </div>
    </>
  )
}

// ─── LEGACY BLOCKS RENDER ─────────────────────────────────────────
// Kept so existing block-based guides (Sri Lanka) keep rendering
// unchanged. Identical to the previous WebGuideView body.
function BlocksBody({
  guide, aboutUsMarkdown, autoLinkPhrases, canViewFull, isLoggedIn, hideAbout,
}: {
  guide: GuideRow
  aboutUsMarkdown: string
  autoLinkPhrases: AutoLinkPhrase[]
  canViewFull: boolean
  isLoggedIn: boolean
  hideAbout: boolean
}) {
  const blocks = (guide.sections.blocks ?? []).slice().sort((a, b) => a.order - b.order)

  let firstPaywalledIdx = -1
  if (!canViewFull) {
    for (let i = 0; i < blocks.length; i++) {
      if (!blocks[i].freePreview) { firstPaywalledIdx = i; break }
    }
  }
  const visibleBlocks = !canViewFull && firstPaywalledIdx !== -1
    ? blocks.slice(0, firstPaywalledIdx)
    : blocks
  const hiddenCount = blocks.length - visibleBlocks.length

  const toc: Array<{ id: string; label: string }> = []
  if (aboutUsMarkdown.trim() && !hideAbout) toc.push({ id: 'about-us', label: 'About us' })
  for (const b of visibleBlocks) {
    if ((b.body ?? '').trim() || b.heading.trim()) {
      toc.push({ id: blockAnchor(b), label: b.heading || 'Section' })
    }
  }

  return (
    <>
      {toc.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-10">
          <details className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <summary className="cursor-pointer px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50">
              <span className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-brand-700">
                <ListOrdered className="w-4 h-4" /> Table of contents
              </span>
              <span className="text-xs text-gray-400 font-medium">{toc.length} sections</span>
            </summary>
            <ol className="border-t border-gray-100 divide-y divide-gray-100">
              {toc.map((entry, i) => (
                <li key={entry.id}>
                  <a href={`#${entry.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-900">
                    <span className="font-medium truncate">
                      <span className="text-gray-400 font-mono text-xs mr-2 tabular-nums">{(i + 1).toString().padStart(2, '0')}</span>
                      {entry.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  </a>
                </li>
              ))}
            </ol>
          </details>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-12 space-y-12">
        {aboutUsMarkdown.trim() && !hideAbout && (
          <GuideSection id="about-us" title="About us">
            <GuideMarkdown markdown={aboutUsMarkdown} autoLinkPhrases={autoLinkPhrases} />
          </GuideSection>
        )}

        {visibleBlocks.map(b => (
          <GuideSection
            key={b.id}
            id={blockAnchor(b)}
            title={b.heading || 'Section'}
            eyebrow={b.kind === 'destination' ? 'Destination' : undefined}
          >
            <GuideMarkdown markdown={b.body} autoLinkPhrases={autoLinkPhrases} />
          </GuideSection>
        ))}

        {!canViewFull && hiddenCount > 0 && (
          <Paywall
            isLoggedIn={isLoggedIn}
            slug={guide.slug}
            hiddenLabel={`${hiddenCount} more section${hiddenCount === 1 ? '' : 's'}`}
            hasOneOff={guide.price_pence > 0}
            priceLabel={formatPrice(guide.price_pence)}
          />
        )}
      </div>
    </>
  )
}

function GuideSection({
  id, title, eyebrow, children,
}: {
  id: string
  title: string
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      {eyebrow && (
        <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">{eyebrow}</p>
      )}
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-5 pb-3 border-b border-gray-200">{title}</h2>
      {children}
    </section>
  )
}

function Paywall({
  isLoggedIn, slug, hiddenLabel, hasOneOff, priceLabel,
}: {
  isLoggedIn: boolean
  slug: string
  hiddenLabel: string
  hasOneOff: boolean
  priceLabel: string
}) {
  return (
    <div className="relative mt-2">
      <div className="bg-brand-950 text-white rounded-2xl p-6 sm:p-8 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-brand-300 mb-3">
          <Lock className="w-3.5 h-3.5" /> {hiddenLabel} hidden
        </span>
        <h3 className="text-2xl sm:text-3xl font-bold mb-3">Keep reading with Premium</h3>
        <p className="text-white/70 leading-relaxed max-w-md mx-auto mb-6">
          A year of access to every premium blog post, every guide, and every learning pack. £25, cancel any time.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {isLoggedIn ? (
            <Link href="/account" className="btn-primary text-base px-7 py-3">
              Upgrade to Premium <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link href={`/signup?next=/guides/${slug}`} className="btn-primary text-base px-7 py-3">
                Sign up to read <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href={`/login?next=/guides/${slug}`} className="text-sm font-medium text-white/70 hover:text-white underline underline-offset-4 decoration-white/30">
                Already a member? Log in
              </Link>
            </>
          )}
        </div>
        {hasOneOff && (
          <p className="text-xs text-white/50 mt-5">
            Or buy just this guide as a one-off — {priceLabel} (coming soon).
          </p>
        )}
      </div>
    </div>
  )
}
