// Cross-promo card for Waystaq, our sister product. Three variants
// so it can sit naturally in different surfaces — the homepage hero
// uses the bold dark-navy gradient, the account / footer use the
// quieter light version.
//
// Brand:
//   - Primary blue   #0066FF
//   - Accent teal    #00C9A7
//   - Dark navy      #0A1628
//   - Light bg       #F0F4FF
// Gradient (135deg): #0A1628 → #0D2B5E (60%) → #0066FF

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type Variant = 'hero' | 'compact' | 'inline'

type Props = {
  variant?: Variant
  // Where the CTA points. Defaults to https://waystaq.com which is
  // their live site. Override when we wire the SSO bundle later.
  ctaHref?: string
  // Override the title / body if the surface wants a different pitch.
  title?: string
  body?: string
  ctaLabel?: string
}

// The blog post that explains why we built Waystaq and how it has
// helped us travel. Linked from every WaystaqCard so readers can dig
// into the story before clicking through to the app.
const WAYSTAQ_BLOG_SLUG = 'the-travel-spreadsheet-finally-broke-us'

const DEFAULTS = {
  title: 'Waystaq',
  subtitle: 'Trip planner & expense tracker',
  body: 'Track flights, visas, tasks and spending across the whole trip. We built it for our own family travel and you can use it free.',
  ctaLabel: 'Open Waystaq',
  ctaHref: 'https://waystaq.com',
}

export default function WaystaqCard({
  variant = 'compact',
  ctaHref = DEFAULTS.ctaHref,
  title,
  body,
  ctaLabel,
}: Props) {
  const subtitle = DEFAULTS.subtitle
  const finalTitle = title ?? DEFAULTS.title
  const finalBody = body ?? DEFAULTS.body
  const finalCtaLabel = ctaLabel ?? DEFAULTS.ctaLabel

  if (variant === 'hero') {
    return (
      <section
        className="py-16 px-4 sm:px-6 lg:px-8"
        style={{ background: 'linear-gradient(135deg, #0A1628 0%, #0D2B5E 60%, #0066FF 100%)' }}
      >
        <div className="max-w-3xl mx-auto text-white">
          <div className="flex items-center gap-4 mb-5 flex-wrap">
            <WaystaqLogo className="h-10 w-auto" />
            <span
              className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{ background: '#00C9A7', color: '#0A1628' }}
            >
              Our other product
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">{finalTitle} — {subtitle}</h2>
          <p className="text-white/85 leading-relaxed text-base sm:text-lg mb-3 max-w-xl">
            {finalBody}
          </p>
          <p className="text-white/70 text-sm mb-6 max-w-xl">
            Read more about how it helps us and how it could help you{' '}
            <Link
              href={`/blog/${WAYSTAQ_BLOG_SLUG}`}
              className="font-semibold text-white underline underline-offset-2 hover:text-white/90"
            >
              here
            </Link>
            .
          </p>
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-sm px-5 py-2.5 rounded-md transition-colors"
            style={{ background: '#FFFFFF', color: '#0066FF' }}
          >
            {finalCtaLabel} <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    )
  }

  // Compact card — used on the account page and as a homepage block.
  // Light background, brand-blue logo + CTA, sits naturally inside
  // the rest of the JFT design without overwhelming it.
  return (
    <div
      className="rounded-2xl border p-6 flex items-center gap-5 flex-wrap"
      style={{ background: '#F0F4FF', borderColor: '#D6E0FF' }}
    >
      <WaystaqLogo className="h-12 w-auto shrink-0" />
      <div className="flex-1 min-w-[14rem]">
        <p
          className="text-[10px] font-bold tracking-widest uppercase mb-1"
          style={{ color: '#0066FF' }}
        >
          Our other product
        </p>
        <h3 className="font-bold mb-1" style={{ color: '#0A1628' }}>
          {finalTitle} — {subtitle}
        </h3>
        <p className="text-sm leading-relaxed mb-2" style={{ color: '#0A1628', opacity: 0.75 }}>
          {finalBody}
        </p>
        <p className="text-xs leading-relaxed mb-3" style={{ color: '#0A1628', opacity: 0.65 }}>
          Read more about how it helps us and how it could help you{' '}
          <Link
            href={`/blog/${WAYSTAQ_BLOG_SLUG}`}
            className="font-semibold underline underline-offset-2"
            style={{ color: '#0066FF' }}
          >
            here
          </Link>
          .
        </p>
        <a
          href={ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-bold rounded-md px-3.5 py-2 transition-colors"
          style={{ background: '#0066FF', color: '#FFFFFF' }}
        >
          {finalCtaLabel} <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}

// Small wrapped <img> so callers can size it via className. Plain
// <img> (not next/image) because the SVG is local and tiny —
// next/image would just add overhead.
function WaystaqLogo({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/waystaq-logos/Logo.svg"
      alt="Waystaq"
      className={className}
      loading="lazy"
      decoding="async"
    />
  )
}
