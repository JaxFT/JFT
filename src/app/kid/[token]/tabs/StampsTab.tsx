'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, Award, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import PassportPage from '@/components/passport/PassportPage'
import { PassportStampFromRow } from '@/components/passport/PassportStamp'
import MilestoneStamp from '@/components/passport/MilestoneStamp'
import { closePassport } from '../PassportCover'
import CountryFlag from '@/components/CountryFlag'
import { getPackMeta } from '@/lib/adventurePackMeta'
import { computeMilestones, type MilestoneStamp as Milestone } from '@/lib/passport-milestones'
import type { StampRow, CountryVisitRow } from '@/lib/passport-kid-db'

type Page =
  | { kind: 'traveler'; milestones: Milestone[]; globals: StampRow[] }
  | { kind: 'country'; countrySlug: string | null; countryName: string; flag: string; iso2: string | null; stamps: StampRow[] }

export default function StampsTab({
  token,
  stamps,
  visits,
  homeCountryIso2,
  onSwipeBeforeFirstPage,
  onSwipeAfterLastPage,
}: {
  token: string
  stamps: StampRow[]
  visits: CountryVisitRow[]
  homeCountryIso2: string | null
  // Called when the kid tries to swipe back past the first internal
  // stamps page. The parent (KidShell) hooks this to "go to previous
  // tab", which falls through to closePassport on the very first tab.
  // Defaulting to closePassport keeps the standalone behaviour sane.
  onSwipeBeforeFirstPage?: () => void
  // Same idea for swipes past the last internal page. Default no-op
  // so the kid bumps against the back cover.
  onSwipeAfterLastPage?: () => void
}) {
  const pages = useMemo(() => buildPages(stamps, visits, homeCountryIso2), [stamps, visits, homeCountryIso2])
  const [pageIndex, setPageIndex] = useState(0)
  // While a page is turning, we keep both layers mounted: the new
  // page sits behind, the leaving page rotates off on top. `turning`
  // holds the outgoing page index + direction; null once the
  // animation has finished and we've dropped the leaving layer.
  const [turning, setTurning] = useState<{ from: number; dir: 'next' | 'prev' } | null>(null)
  const TURN_MS = 420

  // Empty book (no stamps at all, no visits) — but we still show
  // the Traveler page so the empty state is at least one branded
  // page rather than a bare message.
  const onlyTravelerEmpty = pages.length === 1
    && pages[0].kind === 'traveler'
    && pages[0].milestones.length === 0
    && pages[0].globals.length === 0

  const current = pages[pageIndex] ?? pages[0]
  const hasPrev = pageIndex > 0
  const hasNext = pageIndex < pages.length - 1

  const turn = (dir: 'next' | 'prev') => {
    if (turning) return  // ignore taps mid-flip
    if (dir === 'next' && !hasNext) return
    if (dir === 'prev' && !hasPrev) return
    const from = pageIndex
    setTurning({ from, dir })
    setPageIndex(i => i + (dir === 'next' ? 1 : -1))
    // Drop the leaving layer once the keyframe finishes so the
    // settled page is just one PassportPage again.
    window.setTimeout(() => setTurning(null), TURN_MS)
  }

  // ── Swipe + edge-tap gestures ─────────────────────────────────────
  // Real swipe = > 70px horizontal, > 1.5x vertical, < 700ms. Below
  // that it's just finger movement / vertical scroll / a tap.
  // Edge tap = quick small tap landing in the left or right 18% of
  // the page surface.
  // Swipe-right past the very first page fires closePassport(), which
  // dispatches a window event PassportCover listens for and replays
  // the cover-close animation.
  const SWIPE_MIN_PX = 70
  const SWIPE_MAX_MS = 700
  const TAP_MAX_MOVE = 8
  const TAP_MAX_MS = 400
  const EDGE_FRACTION = 0.18
  const startRef = useRef<{ x: number; y: number; time: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Skip if the pointer landed on something interactive (buttons,
    // links, stamp delete affordances) so those keep their own
    // handling. Only background drags count as page-turn gestures.
    const target = e.target as HTMLElement | null
    if (target?.closest('button, a, input, textarea, [role="button"]')) {
      startRef.current = null
      return
    }
    startRef.current = { x: e.clientX, y: e.clientY, time: Date.now() }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    startRef.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const elapsed = Date.now() - start.time
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    const backwardEscape = onSwipeBeforeFirstPage ?? closePassport
    const forwardEscape = onSwipeAfterLastPage ?? (() => { /* end of book */ })

    // Genuine horizontal swipe wins over tap detection.
    if (absDx >= SWIPE_MIN_PX && absDx >= absDy * 1.5 && elapsed <= SWIPE_MAX_MS) {
      if (dx < 0) {
        if (hasNext) turn('next')
        else forwardEscape()
      } else {
        if (hasPrev) turn('prev')
        else backwardEscape()
      }
      return
    }

    // Small tap near an edge → turn that way. Middle taps do nothing.
    if (absDx <= TAP_MAX_MOVE && absDy <= TAP_MAX_MOVE && elapsed <= TAP_MAX_MS) {
      const surface = e.currentTarget.getBoundingClientRect()
      const relX = (e.clientX - surface.left) / surface.width
      if (relX < EDGE_FRACTION) {
        if (hasPrev) turn('prev')
        else backwardEscape()
      } else if (relX > 1 - EDGE_FRACTION) {
        if (hasNext) turn('next')
        else forwardEscape()
      }
    }
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
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
        aria-label={hasPrev ? `Previous page: ${pageLabel(pages[pageIndex - 1])}` : 'Previous page'}
      >
        <ChevronLeft className="w-4 h-4" />
        {/* Country labels can be long ("United Arab Emirates") and
            squeezed the row off the right edge on narrow phones.
            Hidden below sm; the dots still show position and the
            aria-label still names the page for screen readers. */}
        <span className="hidden sm:inline uppercase tracking-widest text-xs truncate max-w-[10rem]">{hasPrev ? pageLabel(pages[pageIndex - 1]) : 'Prev'}</span>
      </button>
      <div className="flex items-center gap-1">
        {pages.map((p, i) => (
          <button
            key={pageKey(p, i)}
            type="button"
            onClick={() => {
              if (i === pageIndex || turning) return
              const dir: 'next' | 'prev' = i > pageIndex ? 'next' : 'prev'
              setTurning({ from: pageIndex, dir })
              setPageIndex(i)
              window.setTimeout(() => setTurning(null), TURN_MS)
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
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
        aria-label={hasNext ? `Next page: ${pageLabel(pages[pageIndex + 1])}` : 'Next page'}
      >
        <span className="hidden sm:inline uppercase tracking-widest text-xs truncate max-w-[10rem]">{hasNext ? pageLabel(pages[pageIndex + 1]) : 'Next'}</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  ) : null

  // scale comes from the pinch/zoom library. We mirror it into local
  // state so the pointerup gesture handler can suppress page turns
  // when the user is panning a zoomed-in page (drags should pan, not
  // turn). Library also disables its own panning at scale ~1 so our
  // gestures pass through cleanly at default zoom.
  const [scale, setScale] = useState(1)
  const isZoomed = scale > 1.05

  return (
    <TransformWrapper
      minScale={1}
      maxScale={4}
      initialScale={1}
      doubleClick={{ disabled: false, mode: 'reset' }}
      pinch={{ disabled: false }}
      wheel={{ step: 0.2 }}
      panning={{ disabled: !isZoomed, velocityDisabled: true }}
      onZoomStop={(ref: ReactZoomPanPinchRef) => setScale(ref.state.scale)}
      onPanningStop={(ref: ReactZoomPanPinchRef) => setScale(ref.state.scale)}
      onTransform={(ref: ReactZoomPanPinchRef) => setScale(ref.state.scale)}
    >
      {(controls) => (
        <div className="relative">
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: '100%' }}
          >
            <div
              onPointerDown={onPointerDown}
              onPointerUp={(e) => { if (!isZoomed) onPointerUp(e) }}
              onPointerCancel={() => { startRef.current = null }}
              style={{ touchAction: isZoomed ? 'none' : 'pan-y' }}
              className="relative w-full"
            >
              <PassportPage className="p-6 sm:p-8" book footer={footerEl}>
                <PageHeader
                  page={pages[pageIndex]}
                  pageIndex={pageIndex}
                  totalStamps={totalStamps}
                  countryPageCount={countryPageCount}
                  totalPages={pages.length}
                />
                <PageInner page={current} token={token} onlyTravelerEmpty={onlyTravelerEmpty} />
              </PassportPage>

              {turning && (
                <div
                  aria-hidden
                  className={`absolute inset-0 ${turning.dir === 'next' ? 'animate-page-out-next' : 'animate-page-out-prev'}`}
                >
                  <PassportPage className="p-6 sm:p-8" book footer={footerEl}>
                    <PageHeader
                      page={pages[turning.from]}
                      pageIndex={turning.from}
                      totalStamps={totalStamps}
                      countryPageCount={countryPageCount}
                      totalPages={pages.length}
                    />
                    <PageInner page={pages[turning.from]} token={token} onlyTravelerEmpty={onlyTravelerEmpty} />
                  </PassportPage>
                </div>
              )}

              {/* Edge hover hints on desktop. Pointer events handled
                  above; these are purely decorative. */}
              <div
                aria-hidden
                className="hidden sm:block absolute inset-y-0 left-0 w-[18%] pointer-events-none opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(90deg, rgba(120,80,30,0.15), transparent)' }}
              />
              <div
                aria-hidden
                className="hidden sm:block absolute inset-y-0 right-0 w-[18%] pointer-events-none opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(-90deg, rgba(120,80,30,0.15), transparent)' }}
              />
            </div>
          </TransformComponent>

          {/* Zoom controls. Sit on top of the book; visible always so
              kids can use them with one hand. Reset only shows when
              actually zoomed so it doesn't clutter the default view. */}
          <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => controls.zoomIn()}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-amber-900 hover:bg-white"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => controls.zoomOut()}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-amber-900 hover:bg-white"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            {isZoomed && (
              <button
                type="button"
                onClick={() => controls.resetTransform()}
                className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow flex items-center justify-center text-amber-900 hover:bg-white"
                aria-label="Reset zoom"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </TransformWrapper>
  )
}

// Header strip shown at the top of every page (page label + counter).
// Pulled out so both the incoming and the outgoing layer can render
// identical headers during a turn without duplicating JSX.
function PageHeader({
  page, pageIndex, totalStamps, countryPageCount, totalPages,
}: {
  page: Page
  pageIndex: number
  totalStamps: number
  countryPageCount: number
  totalPages: number
}) {
  void page
  return (
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
      {totalPages > 1 && (
        <p className="text-xs uppercase tracking-widest" style={{ color: '#5a3a12', opacity: 0.6 }}>
          Page {pageIndex + 1} of {totalPages}
        </p>
      )}
    </div>
  )
}

// Decides whether to render the Global Stamps milestones page or a
// country stamps page from a single Page descriptor.
function PageInner({
  page, token, onlyTravelerEmpty,
}: { page: Page; token: string; onlyTravelerEmpty: boolean }) {
  if (page.kind === 'traveler') {
    return <TravelerPage milestones={page.milestones} globals={page.globals} empty={onlyTravelerEmpty} />
  }
  return <CountryPage group={page} token={token} />
}

// Deterministic per-id hash, used to seed each stamp's tilt and
// jitter so it stays in the same spot across renders.
function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

// Pick a column count that scales with how many stamps are on the
// page. The grid stays the same shape until the count crosses a
// threshold, at which point the whole pile reflows to fit. Cap is
// loose (allow tight overlap) so even narrow phones can show a 6
// or 7 col pile when there are lots of stamps.
function tierForCount(count: number, containerW: number): { cols: number; rows: number } {
  let ideal: number
  if (count <= 6)       ideal = 2
  else if (count <= 10) ideal = 3
  else if (count <= 15) ideal = 4
  else if (count <= 22) ideal = 5
  else if (count <= 30) ideal = 6
  else                  ideal = Math.ceil(Math.sqrt(count * 1.3))
  const minCellW = 32
  const maxByWidth = Math.max(2, Math.floor(containerW / minCellW))
  const cols = Math.max(1, Math.min(ideal, maxByWidth))
  const rows = Math.max(1, Math.ceil(count / cols))
  return { cols, rows }
}

// Safe margins so an edge-row/col stamp at its widest shape (sm
// oval is ~109px wide, sm shield is ~82px tall) and tilted ±10°
// has its edge touching the cream paper boundary at most, never
// past it. Tuned tight on purpose so the pile reaches the edges
// rather than clumping in the middle.
const SAFE_MARGIN_X = 48
const SAFE_MARGIN_Y = 42
// Fixed vertical step between rows in the pile. Smaller than a
// stamp's height so adjacent rows overlap a touch.
const ROW_STEP_PX = 64

function GlobalStampsCanvas({ items }: { items: { key: string; node: React.ReactNode; tiltSeed: string }[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(270)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setContainerW(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const tier = useMemo(() => tierForCount(items.length, containerW), [items.length, containerW])
  // Canvas height is computed from the row count so the bottom of
  // the pile is bounded. If it exceeds the available book frame the
  // PassportPage's overflow-y-auto handles it, but tier transitions
  // are tuned so most counts stay within one screen.
  const canvasH = tier.rows * ROW_STEP_PX + SAFE_MARGIN_Y * 2
  const innerW = Math.max(1, containerW - SAFE_MARGIN_X * 2)
  const cellW = innerW / tier.cols

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: canvasH }}>
      {items.map((it, i) => {
        const col = i % tier.cols
        const row = Math.floor(i / tier.cols)
        const seedX = hashId(`${it.tiltSeed}-x-${tier.cols}`)
        const seedY = hashId(`${it.tiltSeed}-y-${tier.cols}`)
        const seedR = hashId(`${it.tiltSeed}-r`)
        // Jitter ±25% of cell for a scattered feel, clamped below.
        const jitterX = ((seedX % 100) / 100 - 0.5) * 0.5
        const jitterY = ((seedY % 100) / 100 - 0.5) * 0.5
        const tilt = (seedR % 21) - 10
        let left = SAFE_MARGIN_X + (col + 0.5 + jitterX) * cellW
        let top  = SAFE_MARGIN_Y + (row + 0.5 + jitterY) * ROW_STEP_PX
        left = Math.max(SAFE_MARGIN_X, Math.min(containerW - SAFE_MARGIN_X, left))
        top  = Math.max(SAFE_MARGIN_Y, Math.min(canvasH - SAFE_MARGIN_Y, top))
        return (
          <div
            key={it.key}
            className="absolute"
            style={{
              left,
              top,
              transform: `translate(-50%, -50%) rotate(${tilt}deg)`,
              zIndex: i + 1,
            }}
          >
            {it.node}
          </div>
        )
      })}
    </div>
  )
}

function TravelerPage({ milestones, globals, empty }: { milestones: Milestone[]; globals: StampRow[]; empty: boolean }) {
  const totalCount = milestones.length + globals.length
  const trulyEmpty = empty && globals.length === 0

  // Mix milestones and globals into a single ordered list for the
  // scatter canvas. Milestones first, then globals (newest globals
  // last so they land on top of older ones via z-index).
  const items = useMemo(() => {
    const out: { key: string; node: React.ReactNode; tiltSeed: string }[] = []
    milestones.forEach(m => {
      out.push({
        key: `m-${m.id}`,
        tiltSeed: m.id,
        node: <MilestoneStamp
          emoji={m.emoji}
          label={m.label}
          ink={m.ink}
          date={m.earnedAt}
          shape={m.shape}
          size="sm"
          rotate={0}
        />,
      })
    })
    globals.forEach(s => {
      out.push({
        key: `g-${s.id}`,
        tiltSeed: s.id,
        node: <PassportStampFromRow
          row={s}
          date={s.earned_at}
          size="sm"
          rotate={0}
        />,
      })
    })
    return out
  }, [milestones, globals])

  return (
    <section>
      <div
        className="flex items-baseline justify-between gap-3 mb-5 pb-2"
        style={{ borderBottom: '1px dashed rgba(120,80,30,0.25)', color: '#5a3a12' }}
      >
        <div className="inline-flex items-center gap-2">
          <Award className="w-4 h-4" />
          <h3 className="text-base font-extrabold uppercase tracking-[0.18em]">Global Stamps</h3>
        </div>
        <p className="text-xs uppercase tracking-widest opacity-60">
          {trulyEmpty ? 'Empty' : `${totalCount} ${totalCount === 1 ? 'stamp' : 'stamps'}`}
        </p>
      </div>

      {trulyEmpty ? (
        <p
          className="text-center text-xs uppercase tracking-widest py-10 leading-relaxed"
          style={{ color: '#5a3a12', opacity: 0.7 }}
        >
          Visit your first country to start earning global stamps.
          <br />
          Open an Adventure Pack or log a flight to begin.
        </p>
      ) : (
        <GlobalStampsCanvas items={items} />
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
      <div className="flex flex-wrap items-start justify-center gap-x-4 gap-y-5 pt-2 pb-4">
        {group.stamps.map(s => (
          <PassportStampFromRow
            key={s.id}
            row={s}
            country={group.countryName}
            date={s.earned_at}
            size="sm"
          />
        ))}
      </div>
    </section>
  )
}

function buildPages(stamps: StampRow[], visits: CountryVisitRow[], homeCountryIso2: string | null): Page[] {
  // Always lead with the Global Stamps page
  const milestones = computeMilestones(visits, stamps, homeCountryIso2)

  // Any stamp without a country (system OR custom) lives on the
  // Global Stamps page alongside the milestones — "Global" is the
  // default issuer, marked JFT on the stamp face. Stamps WITH a
  // country slot into that country's page. Sort newest first.
  const globals = stamps
    .filter(s => !s.country_slug)
    .sort((a, b) => (a.earned_at < b.earned_at ? 1 : -1))

  // Group all country-tied stamps (system OR custom) by country.
  const byCountry = new Map<string, Extract<Page, { kind: 'country' }>>()
  for (const s of stamps) {
    if (!s.country_slug) continue
    const meta = getPackMeta(s.country_slug)
    if (!meta) continue  // unknown slug, skip rather than create a phantom page
    if (!byCountry.has(s.country_slug)) {
      byCountry.set(s.country_slug, {
        kind: 'country',
        countrySlug: s.country_slug,
        countryName: meta.country,
        flag: meta.flag,
        iso2: meta.iso2,
        stamps: [],
      })
    }
    byCountry.get(s.country_slug)!.stamps.push(s)
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
    { kind: 'traveler', milestones, globals },
    ...countryPages,
  ]
}

function pageLabel(p: Page): string {
  if (p.kind === 'traveler') return 'Global Stamps'
  return p.countryName
}
function pageKey(p: Page, i: number): string {
  return p.kind === 'traveler' ? 'traveler' : (p.countrySlug ?? `__none-${i}`)
}
