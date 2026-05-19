'use client'

// Outer wrapper for a single country pack:
//   - hero (flag, country, colour)
//   - age toggle + 30-day warning + amber data notice
//   - mission picker (emoji buttons, one per section) + progress bar
//   - ONLY the selected mission renders below (tab-style nav)
//   - clear-all button at the bottom

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAdventurePack } from '@/hooks/useAdventurePack'
import type { AdventurePackData, SectionKey } from '@/lib/adventurePackTypes'
import { SECTION_KEYS, SECTION_LABELS, SECTION_EMOJI } from '@/lib/adventurePackTypes'
import AgeToggle from './AgeToggle'
import DataNotice from './DataNotice'
import ClearDataModal from './ClearDataModal'
import PackSection from './PackSection'
import FlagBanner from './FlagBanner'

// PackShell is the pure UI for a pack. Both the user (adult) flow and
// the kid flow render the same shell — they differ only in where the
// data comes from. Each entry-point constructs the right hook and
// passes its result in.
type Props = {
  pack: ReturnType<typeof useAdventurePack>
  data: AdventurePackData
  // Where the "back" link points and what it says. Defaults match the
  // adult flow (back to the listing). Kid mode passes /kid/{token} +
  // "Back to my passport".
  backHref?: string
  backLabel?: string
}

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PackShell({
  pack,
  data,
  backHref = '/adventure-packs',
  backLabel = 'All adventure packs',
}: Props) {
  const [showClear, setShowClear] = useState(false)
  const [showAgeBanner, setShowAgeBanner] = useState<string | null>(null)
  // Currently-selected mission. Defaults to the first; flips to the
  // first incomplete mission once the saved state has loaded so a
  // returning user picks up where they likely left off.
  const [currentSection, setCurrentSection] = useState<SectionKey>(SECTION_KEYS[0])
  const [hasJumpedToFirstIncomplete, setHasJumpedToFirstIncomplete] = useState(false)

  useEffect(() => {
    if (pack.loading || hasJumpedToFirstIncomplete) return
    const firstIncomplete = SECTION_KEYS.find(k => !pack.isMissionComplete(k))
    if (firstIncomplete) setCurrentSection(firstIncomplete)
    setHasJumpedToFirstIncomplete(true)
  }, [pack.loading, pack.isMissionComplete, hasJumpedToFirstIncomplete])

  const goToSection = (key: SectionKey) => {
    setCurrentSection(key)
    // Scroll to the section content so the user sees the new mission
    // start (especially helpful on mobile where the picker takes
    // most of the viewport).
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        document.getElementById('pack-section-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 30)
    }
  }

  const currentIdx = SECTION_KEYS.indexOf(currentSection)
  const prevSection = currentIdx > 0 ? SECTION_KEYS[currentIdx - 1] : null
  const nextSection = currentIdx < SECTION_KEYS.length - 1 ? SECTION_KEYS[currentIdx + 1] : null

  const onAgeChange = (mode: typeof pack.ageMode) => {
    if (mode !== pack.ageMode) {
      pack.changeAgeMode(mode)
      setShowAgeBanner(mode === 'older' ? 'Older kids mode. Some sections have extra challenges.' : 'Younger kids mode. Keeping it simple.')
      setTimeout(() => setShowAgeBanner(null), 4000)
    }
  }

  const percent = Math.round((pack.missionsComplete.length / SECTION_KEYS.length) * 100)
  const expiryLabel = formatExpiry(pack.expiresAt)

  return (
    <div className="min-h-screen bg-sand-50 pt-20 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Link>

        {/* HERO */}
        <FlagBanner
          iso2={data.iso2}
          country={data.country}
          fallbackColour={data.heroColour}
          size="lg"
          rounded
          className="shadow-md"
          as="h1"
        />
        <p className="text-gray-600 mt-4 text-sm sm:text-base leading-relaxed">
          Nine missions to do together while you&apos;re here. Save your answers as you go.
        </p>

        {/* AGE TOGGLE + DATA NOTICES */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <AgeToggle value={pack.ageMode} onChange={onAgeChange} />
            <p className="text-xs text-gray-500">
              {expiryLabel
                ? <>Your answers expire on <strong>{expiryLabel}</strong>.</>
                : <>Answers saved for 30 days, then cleared.</>}
            </p>
          </div>
          {showAgeBanner && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 text-sm text-brand-900">
              {showAgeBanner}
            </div>
          )}
          <DataNotice />
        </div>

        {/* MISSION PICKER. Emoji buttons, one per section. Click to switch. */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600">Pick a mission</p>
            <p className="text-xs font-mono tabular-nums text-gray-600">
              {pack.missionsComplete.length} / {SECTION_KEYS.length} &middot; {percent}%
            </p>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-brand-500 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-9 gap-2">
            {SECTION_KEYS.map(k => {
              const isCurrent = currentSection === k
              const isDone = pack.isMissionComplete(k)
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => goToSection(k)}
                  className={`relative flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl border text-xs font-semibold transition-colors min-h-[5rem] ${
                    isCurrent
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : isDone
                        ? 'bg-brand-50 text-brand-800 border-brand-200 hover:bg-brand-100'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-brand-300 hover:bg-white'
                  }`}
                  aria-current={isCurrent ? 'true' : undefined}
                >
                  <span className="text-2xl leading-none" aria-hidden>{SECTION_EMOJI[k]}</span>
                  <span className="text-[11px] leading-tight text-center">{SECTION_LABELS[k]}</span>
                  {isDone && (
                    <span className={`absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 rounded-full ${
                      isCurrent ? 'bg-white text-brand-700' : 'bg-brand-600 text-white'
                    }`}>
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* SELECTED MISSION */}
        <div id="pack-section-anchor" className="scroll-mt-24" />
        {pack.loading ? (
          <div className="mt-8 text-center text-gray-500 text-sm">Loading your saved answers…</div>
        ) : (
          <div className="mt-6">
            <PackSection
              sectionKey={currentSection}
              data={data}
              pack={pack}
            />
            {/* Prev / next nav within the pack */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => prevSection && goToSection(prevSection)}
                disabled={!prevSection}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-700 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2"
              >
                <ChevronLeft className="w-4 h-4" />
                {prevSection ? SECTION_LABELS[prevSection] : 'Start'}
              </button>
              <button
                type="button"
                onClick={() => nextSection && goToSection(nextSection)}
                disabled={!nextSection}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-700 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2"
              >
                {nextSection ? SECTION_LABELS[nextSection] : 'End'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* CLEAR ALL */}
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => setShowClear(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-700 px-4 py-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> Start this pack again
          </button>
        </div>
      </div>

      <ClearDataModal
        open={showClear}
        onCancel={() => setShowClear(false)}
        onConfirm={async () => { await pack.clearAll(); setShowClear(false) }}
      />
    </div>
  )
}

// Re-export the hook return type to keep section components happy.
export type PackHook = ReturnType<typeof useAdventurePack>
