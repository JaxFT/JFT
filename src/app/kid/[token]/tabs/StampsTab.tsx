'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, Award } from 'lucide-react'
import PassportPage from '@/components/passport/PassportPage'
import PassportStamp from '@/components/passport/PassportStamp'
import MilestoneStamp from '@/components/passport/MilestoneStamp'
import CountryFlag from '@/components/CountryFlag'
import { getPackMeta } from '@/lib/adventurePackMeta'
import { computeMilestones, type MilestoneStamp as Milestone } from '@/lib/passport-milestones'
import type { StampRow, CountryVisitRow } from '@/lib/passport-kid-db'

type Page =
  | { kind: 'traveler'; milestones: Milestone[] }
  | { kind: 'country'; countrySlug: string | null; countryName: string; flag: string; iso2: string | null; stamps: StampRow[] }

export default function StampsTab({
  token,
  stamps,
  visits,
  homeCountryIso2,
}: {
  token: string
  stamps: StampRow[]
  visits: CountryVisitRow[]
  homeCountryIso2: string | null
}) {
  const pages = useMemo(() => buildPages(stamps, visits, homeCountryIso2), [stamps, visits, homeCountryIso2])
  const [pageIndex, setPageIndex] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [animKey, setAnimKey] = useState(0)

  // Empty book (no stamps at all, no visits) — but we still show
  // the Traveler page so the empty state is at least one branded
  // page rather than a bare message.
  const onlyTravelerEmpty = pages.length === 1 && pages[0].kind === 'traveler' && pages[0].milestones.length === 0

  const current = pages[pageIndex] ?? pages[0]
  const hasPrev = pageIndex > 0
  const hasNext = pageIndex < pages.length - 1

  const turn = (dir: 'next' | 'prev') => {
    if (dir === 'next' && !hasNext) return
    if (dir === 'prev' && !hasPrev) return
    setDirection(dir)
    setPageIndex(i => i + (dir === 'next' ? 1 : -1))
    setAnimKey(k => k + 1)
  }

  const totalStamps = stamps.length
  const countryPageCount = pages.length - 1

  const footerEl = pages.length > 1 ? (
    <div
      className="flex items-center justify-between gap-3 text-sm px-2"
      style={{ color: '#5a3a12' }}
    >
      <button
        type="button"
        onClick={() => turn('prev')}
        disabled={!hasPrev}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="uppercase tracking-widest text-xs">{hasPrev ? pageLabel(pages[pageIndex - 1]) : 'Prev'}</span>
      </button>
      <div className="flex items-center gap-1">
        {pages.map((p, i) => (
          <button
            key={pageKey(p, i)}
            type="button"
            onClick={() => {
              if (i === pageIndex) return
              setDirection(i > pageIndex ? 'next' : 'prev')
              setPageIndex(i)
              setAnimKey(k => k + 1)
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              i === pageIndex ? 'bg-amber-800 w-4' : 'bg-amber-800/30 hover:bg-amber-800/50'
            }`}
            aria-label={`Go to ${pageLabel(p)} page`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => turn('next')}
        disabled={!hasNext}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <span className="uppercase tracking-widest text-xs">{hasNext ? pageLabel(pages[pageIndex + 1]) : 'Next'}</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  ) : null

  return (
    <PassportPage className="p-6 sm:p-8" book footer={footerEl}>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em]" style={{ color: '#5a3a12' }}>
            All stamps
          </p>
          <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: '#5a3a12', opacity: 0.6 }}>
            {totalStamps === 0
              ? 'Empty book'
              : `${totalStamps} ${totalStamps === 1 ? 'stamp' : 'stamps'} · ${countryPageCount} ${countryPageCount === 1 ? 'country' : 'countries'}`}
          </p>
        </div>
        {pages.length > 1 && (
          <p className="text-xs uppercase tracking-widest" style={{ color: '#5a3a12', opacity: 0.6 }}>
            Page {pageIndex + 1} of {pages.length}
          </p>
        )}
      </div>

      <div
        key={animKey}
        className={direction === 'next' ? 'animate-page-turn-next' : 'animate-page-turn-prev'}
      >
        {current.kind === 'traveler'
          ? <TravelerPage milestones={current.milestones} empty={onlyTravelerEmpty} />
          : <CountryPage group={current} token={token} />}
      </div>
    </PassportPage>
  )
}

function TravelerPage({ milestones, empty }: { milestones: Milestone[]; empty: boolean }) {
  return (
    <section>
      <div
        className="flex items-baseline justify-between gap-3 mb-5 pb-2"
        style={{ borderBottom: '1px dashed rgba(120,80,30,0.25)', color: '#5a3a12' }}
      >
        <div className="inline-flex items-center gap-2">
          <Award className="w-4 h-4" />
          <h3 className="text-base font-extrabold uppercase tracking-[0.18em]">Traveller</h3>
        </div>
        <p className="text-xs uppercase tracking-widest opacity-60">
          {empty ? 'Empty' : `${milestones.length} ${milestones.length === 1 ? 'badge' : 'badges'}`}
        </p>
      </div>

      {empty ? (
        <p
          className="text-center text-xs uppercase tracking-widest py-10 leading-relaxed"
          style={{ color: '#5a3a12', opacity: 0.7 }}
        >
          Visit your first country to start earning traveller badges.
          <br />
          Open an Adventure Pack or log a flight to begin.
        </p>
      ) : (
        <ScatteredStamps count={milestones.length}>
          {milestones.map(m => (
            <MilestoneStamp
              key={m.id}
              emoji={m.emoji}
              label={m.label}
              ink={m.ink}
              date={m.earnedAt}
              shape={m.shape}
              size="md"
            />
          ))}
        </ScatteredStamps>
      )}
    </section>
  )
}

function CountryPage({ group, token }: {
  group: Extract<Page, { kind: 'country' }>
  token: string
}) {
  return (
    <section>
      <div
        className="flex items-baseline justify-between gap-3 mb-5 pb-2"
        style={{ borderBottom: '1px dashed rgba(120,80,30,0.25)', color: '#5a3a12' }}
      >
        <div className="inline-flex items-center gap-2">
          {group.iso2
            ? <CountryFlag iso2={group.iso2} country={group.countryName} ariaHidden size="lg" />
            : <span className="text-2xl leading-none" aria-hidden>{group.flag}</span>}
          <h3 className="text-base font-extrabold uppercase tracking-[0.18em]">{group.countryName}</h3>
        </div>
        {group.countrySlug && (
          <Link
            href={`/kid/${token}/country/${group.countrySlug}`}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100"
          >
            Full page <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <ScatteredStamps count={group.stamps.length}>
        {group.stamps.map(s => (
          <PassportStamp
            key={s.id}
            type={s.type}
            country={group.countryName === '✈️ Travel' ? null : group.countryName}
            date={s.earned_at}
            size="md"
          />
        ))}
      </ScatteredStamps>
    </section>
  )
}

// Wraps stamp graphics so they sit with comfortable space between
// them by default, but once you've collected 12+ on one page they
// start to overlap — like a real well-used passport page where new
// stamps end up pressed on top of old ones.
function ScatteredStamps({ count, children }: { count: number; children: React.ReactNode }) {
  // count → gap scale. Tight overlap once we cross 12 stamps.
  const overlap = count >= 18 ? '-mx-5 -my-3' : count >= 12 ? '-mx-3 -my-2' : 'gap-x-3 gap-y-3 mx-0 my-0'
  return (
    <div className={`flex flex-wrap items-start justify-center py-3 ${overlap}`}>
      {children}
    </div>
  )
}

function buildPages(stamps: StampRow[], visits: CountryVisitRow[], homeCountryIso2: string | null): Page[] {
  // Always lead with the Traveler page
  const milestones = computeMilestones(visits, stamps, homeCountryIso2)

  // Group country stamps
  const byCountry = new Map<string, Extract<Page, { kind: 'country' }>>()
  for (const s of stamps) {
    const key = s.country_slug ?? '__none__'
    const meta = s.country_slug ? getPackMeta(s.country_slug) : null
    if (!byCountry.has(key)) {
      byCountry.set(key, {
        kind: 'country',
        countrySlug: s.country_slug ?? null,
        countryName: meta?.country ?? '✈️ Travel',
        flag: meta?.flag ?? '✈️',
        iso2: meta?.iso2 ?? null,
        stamps: [],
      })
    }
    byCountry.get(key)!.stamps.push(s)
  }
  for (const g of byCountry.values()) {
    g.stamps.sort((a, b) => (a.earned_at < b.earned_at ? 1 : -1))
  }
  const countryPages = Array.from(byCountry.values()).sort((a, b) => {
    const aLatest = a.stamps[0]?.earned_at ?? ''
    const bLatest = b.stamps[0]?.earned_at ?? ''
    return aLatest < bLatest ? 1 : -1
  })

  return [
    { kind: 'traveler', milestones },
    ...countryPages,
  ]
}

function pageLabel(p: Page): string {
  if (p.kind === 'traveler') return 'Traveller'
  return p.countryName
}
function pageKey(p: Page, i: number): string {
  return p.kind === 'traveler' ? 'traveler' : (p.countrySlug ?? `__none-${i}`)
}
