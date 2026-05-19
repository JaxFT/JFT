'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import PassportPage from '@/components/passport/PassportPage'
import PassportStamp from '@/components/passport/PassportStamp'
import { getPackMeta } from '@/lib/adventurePackData'
import type { StampRow } from '@/lib/passport-kid-db'

type Group = {
  countrySlug: string | null
  countryName: string
  flag: string
  stamps: StampRow[]
}

export default function StampsTab({
  token,
  stamps,
}: {
  token: string
  stamps: StampRow[]
}) {
  const groups = useMemo(() => groupByCountry(stamps), [stamps])
  const [pageIndex, setPageIndex] = useState(0)
  // Direction drives which page-turn animation to play.
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  // Bump on every page change so React re-mounts the inner content
  // and the CSS animation re-runs.
  const [animKey, setAnimKey] = useState(0)

  if (stamps.length === 0) {
    return (
      <PassportPage className="p-6 sm:p-8 min-h-[60vh]">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em]" style={{ color: '#5a3a12' }}>
              All stamps
            </p>
            <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: '#5a3a12', opacity: 0.6 }}>
              Empty book
            </p>
          </div>
        </div>
        <div className="text-center py-16 text-sm" style={{ color: '#5a3a12', opacity: 0.75 }}>
          <p className="text-lg font-semibold mb-2">No stamps yet.</p>
          <p className="text-xs uppercase tracking-widest opacity-70 max-w-xs mx-auto leading-relaxed">
            Pick a food, learn a phrase, or finish a mission. Your first stamp will be pressed here.
          </p>
        </div>
      </PassportPage>
    )
  }

  const current = groups[pageIndex] ?? groups[0]
  const hasPrev = pageIndex > 0
  const hasNext = pageIndex < groups.length - 1

  const turn = (dir: 'next' | 'prev') => {
    if (dir === 'next' && !hasNext) return
    if (dir === 'prev' && !hasPrev) return
    setDirection(dir)
    setPageIndex(i => i + (dir === 'next' ? 1 : -1))
    setAnimKey(k => k + 1)
  }

  return (
    <PassportPage className="p-6 sm:p-8 min-h-[60vh]">
      {/* Header always visible — book "spine" info */}
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em]" style={{ color: '#5a3a12' }}>
            All stamps
          </p>
          <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: '#5a3a12', opacity: 0.6 }}>
            {stamps.length} {stamps.length === 1 ? 'stamp' : 'stamps'} across {groups.length} {groups.length === 1 ? 'page' : 'pages'}
          </p>
        </div>
        {groups.length > 1 && (
          <p className="text-xs uppercase tracking-widest" style={{ color: '#5a3a12', opacity: 0.6 }}>
            Page {pageIndex + 1} of {groups.length}
          </p>
        )}
      </div>

      {/* The animated page itself. key change + class re-runs the CSS
          keyframes for a brief 3D page-turn effect. */}
      <div
        key={animKey}
        className={direction === 'next' ? 'animate-page-turn-next' : 'animate-page-turn-prev'}
      >
        <CountryPage group={current} token={token} />
      </div>

      {/* Page-turn controls — only shown when there's more than one page */}
      {groups.length > 1 && (
        <footer
          className="mt-8 pt-4 flex items-center justify-between gap-3 text-sm"
          style={{ borderTop: '1px dashed rgba(120,80,30,0.25)', color: '#5a3a12' }}
        >
          <button
            type="button"
            onClick={() => turn('prev')}
            disabled={!hasPrev}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="uppercase tracking-widest text-xs">{hasPrev ? groups[pageIndex - 1].countryName : 'Prev'}</span>
          </button>

          {/* Tiny page-dot indicator */}
          <div className="flex items-center gap-1">
            {groups.map((g, i) => (
              <button
                key={g.countrySlug ?? '__none__'}
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
                aria-label={`Go to ${g.countryName} page`}
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
            <span className="uppercase tracking-widest text-xs">{hasNext ? groups[pageIndex + 1].countryName : 'Next'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </footer>
      )}
    </PassportPage>
  )
}

function CountryPage({ group, token }: { group: Group; token: string }) {
  return (
    <section>
      {/* Country chapter header */}
      <div
        className="flex items-baseline justify-between gap-3 mb-5 pb-2"
        style={{ borderBottom: '1px dashed rgba(120,80,30,0.25)', color: '#5a3a12' }}
      >
        <div className="inline-flex items-center gap-2">
          <span className="text-2xl leading-none" aria-hidden>{group.flag}</span>
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
      {/* The stamps for this country, clustered. */}
      <div className="flex flex-wrap items-start justify-center gap-x-4 gap-y-6 py-3">
        {group.stamps.map(s => (
          <PassportStamp
            key={s.id}
            type={s.type}
            country={group.countryName === '✈️ Travel' ? null : group.countryName}
            date={s.earned_at}
            size="md"
          />
        ))}
      </div>
    </section>
  )
}

function groupByCountry(stamps: StampRow[]): Group[] {
  const byCountry = new Map<string, Group>()
  for (const s of stamps) {
    const key = s.country_slug ?? '__none__'
    const meta = s.country_slug ? getPackMeta(s.country_slug) : null
    if (!byCountry.has(key)) {
      byCountry.set(key, {
        countrySlug: s.country_slug ?? null,
        countryName: meta?.country ?? '✈️ Travel',
        flag: meta?.flag ?? '✈️',
        stamps: [],
      })
    }
    byCountry.get(key)!.stamps.push(s)
  }
  const groups = Array.from(byCountry.values())
  for (const g of groups) {
    g.stamps.sort((a, b) => (a.earned_at < b.earned_at ? 1 : -1))
  }
  groups.sort((a, b) => {
    const aLatest = a.stamps[0]?.earned_at ?? ''
    const bLatest = b.stamps[0]?.earned_at ?? ''
    return aLatest < bLatest ? 1 : -1
  })
  return groups
}
