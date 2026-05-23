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
  logo: string
  code?: string
}

const AFFILIATES: Affiliate[] = [
  {
    name: 'Get Your Guide',
    blurb: 'A global marketplace for tours, day trips, attraction tickets and experiences. Run by a Berlin company. Tens of thousands of activities in 7,500+ destinations, with verified reviews and free cancellation on most bookings.',
    url: 'https://getyourguide.tpx.lt/klLLpt6d',
    logo: '/images/affiliates/getyourguide.png',
    code: 'JAXFAMILYTRAVELS5',
  },
  {
    name: 'Discover Cars',
    blurb: 'A car rental comparison site that searches 800+ rental companies (big chains like Hertz and small local outfits) across 145 countries to find the cheapest price for the dates you want.',
    url: 'https://discovercars.tpx.lt/mNKBUxoR',
    logo: '/images/affiliates/discovercars.png',
  },
  {
    name: 'KiwiTaxi',
    blurb: 'A pre-booked airport transfer service in 100+ countries. You set a pickup time and destination, a driver is waiting in arrivals with a sign, fixed price up front, no haggling.',
    url: 'https://kiwitaxi.tpx.lt/PSKtDqyT',
    logo: '/images/affiliates/kiwitaxi.png',
  },
  {
    name: '12Go Asia',
    blurb: 'A transport booking platform specialising in Asia. Buses, trains, ferries, flights, even joint tickets that combine multiple legs (e.g. bus + boat to a Thai island), all in one search.',
    url: 'https://12go.tpx.lt/vQKbzdzj',
    logo: '/images/affiliates/12go.png',
  },
  {
    name: 'Klook',
    blurb: 'A Hong Kong-based platform for attractions, theme parks, transport passes and SIM cards, with the deepest coverage of any service across Asia-Pacific. Useful for things like Disneyland tickets and bullet-train passes.',
    url: 'https://klook.tpx.lt/lfIKzRfO',
    logo: '/images/affiliates/klook.png',
  },
  {
    name: 'Airalo',
    blurb: 'An eSIM provider with mobile data plans for 200+ countries. Buy and install before you leave, the data starts the moment you land. No physical SIM swap, no roaming charges.',
    url: 'https://airalo.tpx.lt/1RNiRqr7',
    logo: '/images/affiliates/airalo.png',
    code: 'BEC1431',
  },
  {
    name: 'Omio',
    blurb: 'A European-first transport booking platform. Compare trains, buses and flights across Europe in one search and book on the same ticket. Particularly strong for cross-border journeys.',
    url: 'https://omio.tpx.lt/jMKpMgZC',
    logo: '/images/affiliates/omio.png',
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
              className="group flex items-start gap-3 bg-white/5 hover:bg-white/10 transition-colors rounded-lg p-4"
            >
              {/* Logo on a small white tile so the brand mark is
                  legible against the dark card background regardless of
                  its native colour. */}
              <div className="shrink-0 w-10 h-10 rounded-md bg-white flex items-center justify-center overflow-hidden">
                <img
                  src={a.logo}
                  alt=""
                  loading="lazy"
                  className="w-9 h-9 object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white text-sm leading-tight">{a.name}</p>
                <p className="text-xs text-white/70 leading-relaxed mt-1">{a.blurb}</p>
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
