'use client'

// Reusable structured-tagging form block, used in both the blog
// create-wizard (step 2) and the blog edit form. Three sections:
//
//   1. Travel Stage — pick 1-2 of 5 fixed stages (Dreaming, Planning,
//      On the road, Long-term life, Worldschooling).
//   2. Destination country — continent-grouped collapsible picker.
//      Reuses CONTINENT_ORDER from adventurePackTypes. "No specific
//      destination" is its own option for general posts.
//   3. Topic buckets — pick up to 3 of 10 fixed topics.
//
// Travel stage + destination are required to publish (enforced at the
// publish button); topics are optional.

import { useMemo, useState } from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'
import {
  TRAVEL_STAGES, BLOG_TOPICS,
  MAX_TRAVEL_STAGES_PER_POST, MAX_TOPICS_PER_POST,
  type TravelStage, type BlogTopic,
} from '@/lib/blog-meta'
import { CONTINENT_ORDER, type Continent } from '@/lib/adventurePackTypes'
import { PACK_META } from '@/lib/adventurePackData'
import CountryFlag from '@/components/CountryFlag'

type Props = {
  travelStages: TravelStage[]
  onTravelStagesChange: (next: TravelStage[]) => void
  destinationCountry: string | null
  onDestinationCountryChange: (next: string | null) => void
  topics: BlogTopic[]
  onTopicsChange: (next: BlogTopic[]) => void
}

export default function TaggingFields({
  travelStages, onTravelStagesChange,
  destinationCountry, onDestinationCountryChange,
  topics, onTopicsChange,
}: Props) {
  const toggleStage = (s: TravelStage) => {
    if (travelStages.includes(s)) {
      onTravelStagesChange(travelStages.filter(x => x !== s))
    } else {
      if (travelStages.length >= MAX_TRAVEL_STAGES_PER_POST) {
        // Replace the oldest pick so a second click always wins.
        onTravelStagesChange([...travelStages.slice(1), s])
      } else {
        onTravelStagesChange([...travelStages, s])
      }
    }
  }

  const toggleTopic = (t: BlogTopic) => {
    if (topics.includes(t)) {
      onTopicsChange(topics.filter(x => x !== t))
    } else if (topics.length < MAX_TOPICS_PER_POST) {
      onTopicsChange([...topics, t])
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 1. TRAVEL STAGE ───────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <label className="block text-sm font-bold text-gray-900">
            Travel stage <span className="text-red-600">*</span>
          </label>
          <p className="text-xs text-gray-500">Pick up to {MAX_TRAVEL_STAGES_PER_POST} — what stage is the reader at?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {TRAVEL_STAGES.map(s => {
            const active = travelStages.includes(s.value)
            const Icon = s.icon
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleStage(s.value)}
                aria-pressed={active}
                className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
                  active
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300 hover:bg-brand-50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-sm font-bold">{s.label}</span>
                  {active && <Check className="w-3 h-3 ml-auto" />}
                </div>
                <p className={`text-[11px] leading-snug ${active ? 'text-white/80' : 'text-gray-500'}`}>
                  {s.description}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── 2. DESTINATION COUNTRY ────────────────────────────── */}
      <DestinationPicker
        value={destinationCountry}
        onChange={onDestinationCountryChange}
      />

      {/* ── 3. TOPIC BUCKETS ──────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <label className="block text-sm font-bold text-gray-900">Topics</label>
          <p className="text-xs text-gray-500">
            Optional · pick up to {MAX_TOPICS_PER_POST} · {topics.length}/{MAX_TOPICS_PER_POST}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BLOG_TOPICS.map(t => {
            const active = topics.includes(t.value)
            const Icon = t.icon
            const disabled = !active && topics.length >= MAX_TOPICS_PER_POST
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleTopic(t.value)}
                disabled={disabled}
                aria-pressed={active}
                title={t.description}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? 'bg-brand-600 text-white border-brand-600'
                    : disabled
                      ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300 hover:bg-brand-50'
                }`}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

// ── DESTINATION PICKER ─────────────────────────────────────────
// Inline collapsible by continent (same pattern as Adventure Packs)
// with a "No specific destination" option pinned at the top. The
// trigger button shows the currently-picked country.

function DestinationPicker({
  value, onChange,
}: {
  value: string | null
  onChange: (next: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [openContinents, setOpenContinents] = useState<Set<Continent>>(new Set())

  const livePacks = useMemo(() => PACK_META.filter(p => p.status === 'live'), [])
  const grouped = useMemo(() => {
    const byContinent = new Map<Continent, typeof livePacks>()
    for (const c of CONTINENT_ORDER) byContinent.set(c, [])
    for (const p of livePacks) byContinent.get(p.continent)?.push(p)
    for (const list of byContinent.values()) {
      list.sort((a, b) => a.country.localeCompare(b.country))
    }
    return CONTINENT_ORDER
      .map(c => ({ continent: c, packs: byContinent.get(c) ?? [] }))
      .filter(g => g.packs.length > 0)
  }, [livePacks])

  const selectedPack = value ? livePacks.find(p => p.slug === value) : null

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <label className="block text-sm font-bold text-gray-900">
          Destination <span className="text-red-600">*</span>
        </label>
        <p className="text-xs text-gray-500">Which country is this post about? Pick "No specific destination" for general posts.</p>
      </div>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-brand-300 text-left"
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          {selectedPack
            ? <>
                <CountryFlag iso2={selectedPack.iso2} country={selectedPack.country} ariaHidden size="sm" />
                <span className="text-sm font-semibold text-gray-900 truncate">{selectedPack.country}</span>
              </>
            : value === null
              ? <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  <Globe className="w-4 h-4 text-gray-500" /> Pick a destination
                </span>
              : <span className="text-sm text-amber-700">Unknown destination "{value}"</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 border border-gray-200 rounded-lg bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-100 inline-flex items-center gap-2 ${
              value === null
                ? 'bg-brand-50 text-brand-800 font-semibold'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Globe className="w-4 h-4 text-gray-500" />
            No specific destination (general post)
          </button>

          <div className="max-h-72 overflow-y-auto">
            {grouped.map(({ continent, packs }) => {
              const isOpen = openContinents.has(continent)
              return (
                <div key={continent} className="border-b border-gray-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenContinents(prev => {
                        const next = new Set(prev)
                        if (next.has(continent)) next.delete(continent)
                        else next.add(continent)
                        return next
                      })
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left"
                  >
                    <span className="inline-flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-gray-800">{continent}</span>
                      <span className="text-[11px] text-gray-500">{packs.length}</span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                  </button>
                  {isOpen && (
                    <ul className="py-1">
                      {packs.map(p => {
                        const selected = p.slug === value
                        return (
                          <li key={p.slug}>
                            <button
                              type="button"
                              onClick={() => { onChange(p.slug); setOpen(false) }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                                selected
                                  ? 'bg-brand-50 text-brand-800 font-semibold'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <CountryFlag iso2={p.iso2} country={p.country} ariaHidden size="sm" />
                              {p.country}
                              {selected && <Check className="w-3.5 h-3.5 ml-auto" />}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
