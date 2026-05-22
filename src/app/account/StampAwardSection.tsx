'use client'

// Family-level stamp award form. Lives on /account beneath the
// Country visits picker.
//
// The parent picks which child(ren) to award to (single child or
// "All children"), then either picks one of the 18 system stamp
// types or creates a one-off custom stamp with their own label,
// emoji, shape, and ink. Submitting loops the existing per-child
// POST endpoint so the new family form works against the same API.
//
// Parents don't see the kid's existing stamp collection here —
// kids show parents their collection in the actual passport.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Stamp as StampIcon, Plus, Loader2, Users } from 'lucide-react'
import { STAMP_META, type StampType } from '@/lib/passport-types'
import PassportStamp from '@/components/passport/PassportStamp'
import type { StampShape } from '@/lib/passport-milestones'

const INK_PALETTE = [
  { name: 'Brand green', value: '#0f3a2a' },
  { name: 'Deep red',    value: '#9c2516' },
  { name: 'Royal purple',value: '#5b21b6' },
  { name: 'Navy',        value: '#1e3a8a' },
  { name: 'Emerald',     value: '#15803d' },
  { name: 'Saddle',      value: '#5a3a12' },
]

const CUSTOM_SHAPES: { value: StampShape; label: string }[] = [
  { value: 'circle',  label: 'Circle' },
  { value: 'oval',    label: 'Oval' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'flag',    label: 'Flag' },
  { value: 'shield',  label: 'Shield' },
  { value: 'hexagon', label: 'Hexagon' },
]

const ALL_STAMP_TYPES: StampType[] = [
  'BRAVE_EATER', 'LOCAL_LINGO', 'MAP_READER', 'MONEY_CHANGER',
  'GEOGRAPHY_GENIUS', 'SCAVENGER_HUNTER', 'SENSE_SEEKER',
  'STORY_KEEPER', 'FAMILY_CHATTERBOX', 'ADVENTURE_PACK_COMPLETE',
  'STEP_CHAMP', 'EXPLORER_DAY', 'CULTURE_SPOTTER', 'NATURE_LOVER',
  'BRAVE_TRAVELLER', 'WATER_ADVENTURER', 'EARLY_BIRD',
]

type ChildLite = { id: string; name: string; avatar: string }
type PackMetaLite = { slug: string; country: string; flag: string }

export default function StampAwardSection({
  children: childrenList,
  allPacks,
}: {
  children: ChildLite[]
  allPacks: PackMetaLite[]
}) {
  const router = useRouter()

  // "" means "All children". Otherwise it's a child id.
  const [targetChildId, setTargetChildId] = useState<string>(
    childrenList.length === 1 ? childrenList[0].id : '',
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Manual award form state
  const [type, setType] = useState<StampType>('NATURE_LOVER')
  const [countrySlug, setCountrySlug] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [earnedAt, setEarnedAt] = useState<string>(today())
  const [awarding, setAwarding] = useState(false)

  // Custom stamp creator state
  const [customLabel, setCustomLabel] = useState<string>('')
  const [customEmoji, setCustomEmoji] = useState<string>('✨')
  const [customShape, setCustomShape] = useState<StampShape>('circle')
  const [customInk, setCustomInk] = useState<string>(INK_PALETTE[0].value)
  const [customCountry, setCustomCountry] = useState<string>('')
  const [customDate, setCustomDate] = useState<string>(today())
  const [customNote, setCustomNote] = useState<string>('')
  const [customBusy, setCustomBusy] = useState(false)

  // Pack metadata lookup for the live custom preview.
  const packBySlug = new Map(allPacks.map(p => [p.slug, p]))

  // Either every child in the family or just the picked one.
  const targetIds = (): string[] => {
    if (targetChildId === '') return childrenList.map(c => c.id)
    return [targetChildId]
  }

  const awardManual = async (e: React.FormEvent) => {
    e.preventDefault()
    setAwarding(true)
    setError(null)
    setSuccess(null)
    try {
      const ids = targetIds()
      if (ids.length === 0) throw new Error('Pick a child first.')
      for (const id of ids) {
        const res = await fetch(`/api/family/children/${id}/stamps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            country_slug: countrySlug || null,
            note: note.trim() || null,
            earned_at: earnedAt,
          }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      }
      setSuccess(`Awarded ${STAMP_META[type].label}${ids.length > 1 ? ` × ${ids.length}` : ''}.`)
      setNote('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not award stamp')
    } finally {
      setAwarding(false)
    }
  }

  const awardCustom = async (e: React.FormEvent) => {
    e.preventDefault()
    const label = customLabel.trim()
    const emoji = customEmoji.trim()
    if (!label) { setError('Custom stamp needs a label.'); return }
    if (!emoji) { setError('Custom stamp needs an emoji.'); return }
    setCustomBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const ids = targetIds()
      if (ids.length === 0) throw new Error('Pick a child first.')
      for (const id of ids) {
        const res = await fetch(`/api/family/children/${id}/stamps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'CUSTOM',
            custom_label: label,
            custom_emoji: emoji,
            custom_shape: customShape,
            custom_ink: customInk,
            country_slug: customCountry || null,
            note: customNote.trim() || null,
            earned_at: customDate,
          }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      }
      setSuccess(`Custom stamp "${label}"${ids.length > 1 ? ` × ${ids.length}` : ''} awarded.`)
      setCustomLabel('')
      setCustomNote('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not award stamp')
    } finally {
      setCustomBusy(false)
    }
  }

  if (childrenList.length === 0) return null

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <StampIcon className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Award a stamp</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Pick one of the 18 system stamps below, or make your own. Stamps land in the passport immediately for the
        child you pick.
      </p>

      {/* CHILD PICKER */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-2 inline-flex items-center gap-1.5">
          <Users className="w-3 h-3" /> Who's this for?
        </p>
        <div className="flex flex-wrap gap-1.5">
          {childrenList.length > 1 && (
            <button
              type="button"
              onClick={() => setTargetChildId('')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                targetChildId === ''
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All children
            </button>
          )}
          {childrenList.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setTargetChildId(c.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                targetChildId === c.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span aria-hidden>{c.avatar}</span> {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* MANUAL AWARD FORM */}
      <form onSubmit={awardManual} className="border-t border-gray-100 pt-5 space-y-3">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Award an existing stamp</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={type}
            onChange={e => setType(e.target.value as StampType)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            {ALL_STAMP_TYPES.map(t => (
              <option key={t} value={t}>{STAMP_META[t].emoji} {STAMP_META[t].label}</option>
            ))}
          </select>
          <select
            value={countrySlug}
            onChange={e => setCountrySlug(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="">Global (no country)</option>
            {allPacks.map(p => (
              <option key={p.slug} value={p.slug}>{p.flag} {p.country}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 500))}
            placeholder="Note (optional)"
            maxLength={500}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <input
            type="date"
            value={earnedAt}
            max={today()}
            onChange={e => setEarnedAt(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button
            type="submit"
            disabled={awarding}
            className="btn-primary !py-2 !px-3 !text-sm disabled:opacity-60"
          >
            {awarding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Award
          </button>
        </div>
        <p className="text-xs text-gray-400">{STAMP_META[type].description}</p>
      </form>

      {/* CUSTOM STAMP CREATOR */}
      <form onSubmit={awardCustom} className="border-t border-gray-100 pt-5 mt-6 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Or make a custom stamp</p>
          <p className="text-[10px] text-gray-400">JFT mark stays on every stamp</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="text"
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value.slice(0, 60))}
                placeholder="Label (e.g. Lost a tooth in Tokyo)"
                maxLength={60}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                type="text"
                value={customEmoji}
                onChange={e => setCustomEmoji(e.target.value.slice(0, 4))}
                placeholder="🦷"
                maxLength={4}
                className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-center text-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
                aria-label="Emoji"
              />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Shape</p>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOM_SHAPES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setCustomShape(s.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                      customShape === s.value
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Ink colour</p>
              <div className="flex flex-wrap gap-1.5">
                {INK_PALETTE.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCustomInk(c.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      customInk === c.value ? 'border-brand-600 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.value }}
                    aria-label={c.name}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <select
              value={customCountry}
              onChange={e => setCustomCountry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="">Global (no country)</option>
              {allPacks.map(p => (
                <option key={p.slug} value={p.slug}>{p.flag} {p.country}</option>
              ))}
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
              <input
                type="text"
                value={customNote}
                onChange={e => setCustomNote(e.target.value.slice(0, 500))}
                placeholder="Note (optional)"
                maxLength={500}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <input
                type="date"
                value={customDate}
                max={today()}
                onChange={e => setCustomDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <button
                type="submit"
                disabled={customBusy}
                className="btn-primary !py-2 !px-3 !text-sm disabled:opacity-60"
              >
                {customBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Award
              </button>
            </div>
          </div>

          {/* Live preview. Uses the production PassportStamp renderer. */}
          <div className="flex flex-col items-center justify-start gap-2 bg-sand-50 rounded-xl p-4 sm:min-w-[160px]">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">Preview</p>
            <PassportStamp
              label={customLabel.trim() || 'Your label'}
              emoji={customEmoji.trim() || '✨'}
              ink={customInk}
              shape={customShape}
              country={customCountry ? (packBySlug.get(customCountry)?.country ?? null) : null}
              date={customDate}
              size="sm"
            />
          </div>
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-4">{error}</p>
      )}
      {success && (
        <p className="text-sm text-brand-800 bg-brand-50 border border-brand-100 rounded-md px-3 py-2 mt-4">{success}</p>
      )}
    </section>
  )
}

function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
