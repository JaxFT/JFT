'use client'

// Outer wrapper for a single country pack:
//   - hero (flag, country, colour)
//   - age toggle + 30-day warning + amber data notice
//   - progress bar + 9 badges (one per section)
//   - sequential PackSection renders
//   - clear-all button at the bottom

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useAdventurePack } from '@/hooks/useAdventurePack'
import type { AdventurePackData, SectionKey } from '@/lib/adventurePackTypes'
import { SECTION_KEYS, SECTION_LABELS } from '@/lib/adventurePackTypes'
import AgeToggle from './AgeToggle'
import DataNotice from './DataNotice'
import ClearDataModal from './ClearDataModal'
import PackSection from './PackSection'

type Props = {
  userId: string
  data: AdventurePackData
}

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PackShell({ userId, data }: Props) {
  const pack = useAdventurePack(userId, data.slug)
  const [showClear, setShowClear] = useState(false)
  const [showAgeBanner, setShowAgeBanner] = useState<string | null>(null)

  const onAgeChange = (mode: typeof pack.ageMode) => {
    if (mode !== pack.ageMode) {
      pack.changeAgeMode(mode)
      setShowAgeBanner(mode === 'older' ? 'Ages 8–11 mode — some sections have extra challenges' : 'Ages 5–7 mode — keeping it simple')
      setTimeout(() => setShowAgeBanner(null), 4000)
    }
  }

  const percent = Math.round((pack.missionsComplete.length / SECTION_KEYS.length) * 100)
  const expiryLabel = formatExpiry(pack.expiresAt)

  return (
    <div className="min-h-screen bg-sand-50 pt-20 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        <Link href="/adventure-packs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> All adventure packs
        </Link>

        {/* HERO */}
        <div className={`${data.heroColour} text-white rounded-2xl px-6 py-8 sm:px-8 sm:py-10 shadow-md`}>
          <div className="text-6xl mb-2 leading-none">{data.flag}</div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{data.country} adventure pack</h1>
          <p className="text-white/80 mt-2 text-base leading-relaxed">
            Nine missions to do together while you&apos;re here. Save your answers as you go.
          </p>
        </div>

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

        {/* PROGRESS + BADGES */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-600">Mission progress</p>
            <p className="text-xs font-mono tabular-nums text-gray-600">
              {pack.missionsComplete.length} / {SECTION_KEYS.length} &middot; {percent}%
            </p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-brand-500 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SECTION_KEYS.map(k => (
              <span
                key={k}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                  pack.isMissionComplete(k)
                    ? 'bg-brand-100 text-brand-800'
                    : 'bg-gray-50 text-gray-400 border border-gray-100'
                }`}
              >
                {SECTION_LABELS[k]}
              </span>
            ))}
          </div>
        </div>

        {/* SECTIONS */}
        {pack.loading ? (
          <div className="mt-8 text-center text-gray-500 text-sm">Loading your saved answers…</div>
        ) : (
          <div className="mt-8 space-y-10">
            {SECTION_KEYS.map(key => (
              <PackSection
                key={key}
                sectionKey={key}
                data={data}
                pack={pack}
              />
            ))}
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
