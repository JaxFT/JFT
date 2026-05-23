'use client'

// Affiliate links panel inside the Brands & Creators card on /work-with-us.
// Hidden behind a toggle so the card stays uncluttered for the primary
// "contact us about a collab" path. When opened it lists the brands we
// actually use, with their referral links and any discount codes.

import { useState } from 'react'
import { ExternalLink, Link as LinkIcon, ChevronDown, Copy, Check } from 'lucide-react'

type Affiliate = {
  name: string
  blurb: string
  url: string
  code?: string
}

const AFFILIATES: Affiliate[] = [
  {
    name: 'Get Your Guide',
    blurb: 'Tours and tickets in nearly every city we visit.',
    url: 'https://getyourguide.tpx.lt/klLLpt6d',
    code: 'JAXFAMILYTRAVELS5',
  },
  {
    name: 'Discover Cars',
    blurb: 'Car hire comparison, the best prices we have found.',
    url: 'https://discovercars.tpx.lt/mNKBUxoR',
  },
  {
    name: 'KiwiTaxi',
    blurb: 'Pre-booked airport transfers with a driver waiting on arrival.',
    url: 'https://kiwitaxi.tpx.lt/PSKtDqyT',
  },
  {
    name: '12Go Asia',
    blurb: 'Buses, trains, ferries and flights across Asia, all in one search.',
    url: 'https://12go.tpx.lt/vQKbzdzj',
  },
  {
    name: 'Klook',
    blurb: 'Attractions, theme parks, day trips and SIM cards across Asia.',
    url: 'https://klook.tpx.lt/lfIKzRfO',
  },
  {
    name: 'Airalo',
    blurb: 'eSIMs for almost every country. We use this on every trip.',
    url: 'https://airalo.tpx.lt/1RNiRqr7',
    code: 'BEC1431',
  },
  {
    name: 'Omio',
    blurb: 'Trains, buses and flights across Europe in one booking.',
    url: 'https://omio.tpx.lt/jMKpMgZC',
  },
]

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault()
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // clipboard blocked, just no-op
        }
      }}
      className="inline-flex items-center gap-1.5 text-xs font-mono tracking-wider bg-white/15 hover:bg-white/25 transition-colors px-2.5 py-1 rounded-md text-white"
      aria-label={`Copy discount code ${code}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {code}
    </button>
  )
}

export default function AffiliateLinks() {
  const [open, setOpen] = useState(false)

  // When the panel is open, basis-full forces this whole component
  // onto its own line inside the parent flex-wrap container so the
  // panel reads full-width below the Contact-us button instead of
  // squeezing into a narrow column beside it.
  return (
    <div className={open ? 'basis-full' : ''}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="affiliate-links-panel"
        className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors text-white font-bold text-sm px-5 py-2.5 rounded-md"
      >
        <LinkIcon className="w-4 h-4" />
        {open ? 'Hide affiliate links' : 'See our affiliate links'}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id="affiliate-links-panel"
          className="mt-5 space-y-3"
        >
          <p className="text-xs text-white/70 leading-relaxed">
            We earn a small commission if you book through these links, at no extra cost to you. We only list services
            we genuinely use ourselves. Where there&apos;s a code, it&apos;s a discount for you.
          </p>
          {AFFILIATES.map(a => (
            <a
              key={a.url}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group flex items-start justify-between gap-3 bg-white/5 hover:bg-white/10 transition-colors rounded-lg p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white text-sm leading-tight">{a.name}</p>
                <p className="text-xs text-white/70 leading-relaxed mt-0.5">{a.blurb}</p>
                {a.code && (
                  <div className="mt-2.5">
                    <CopyCodeButton code={a.code} />
                  </div>
                )}
              </div>
              <ExternalLink className="w-4 h-4 text-white/60 group-hover:text-white shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
