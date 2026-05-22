'use client'

// "Suggest a stamp" sheet shown to kids in guided / creator modes.
// Two paths: pick from the system stamps, or make a custom one.
// Submitting fires the new /api/kid/[token]/stamps/suggest route;
// the suggestion lands in the parent's approval queue on /family.

import { useState } from 'react'
import { Sparkles, Loader2, X, Check } from 'lucide-react'
import { STAMP_META, type StampType } from '@/lib/passport-types'
import PassportStamp from '@/components/passport/PassportStamp'
import { PACK_META } from '@/lib/adventurePackMeta'
import type { StampShape } from '@/lib/passport-milestones'

const SYSTEM_STAMP_TYPES: StampType[] = [
  'BRAVE_EATER', 'LOCAL_LINGO', 'MAP_READER', 'MONEY_CHANGER',
  'GEOGRAPHY_GENIUS', 'SCAVENGER_HUNTER', 'SENSE_SEEKER',
  'STORY_KEEPER', 'FAMILY_CHATTERBOX', 'ADVENTURE_PACK_COMPLETE',
  'STEP_CHAMP', 'EXPLORER_DAY', 'CULTURE_SPOTTER', 'NATURE_LOVER',
  'BRAVE_TRAVELLER', 'WATER_ADVENTURER', 'EARLY_BIRD', 'ANIMAL_SPOTTER',
]

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

export default function SuggestStampSheet({
  token,
  onClose,
}: {
  token: string
  onClose: () => void
}) {
  const [mode, setMode] = useState<'system' | 'custom'>('system')
  const [type, setType] = useState<StampType>('BRAVE_EATER')
  const [countrySlug, setCountrySlug] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [customEmoji, setCustomEmoji] = useState<string>('✨')
  const [customShape, setCustomShape] = useState<StampShape>('circle')
  const [customInk, setCustomInk] = useState<string>(INK_PALETTE[0].value)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  const packs = PACK_META

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const body = mode === 'system'
        ? {
            type,
            country_slug: countrySlug || null,
            note: note.trim() || null,
          }
        : {
            type: 'CUSTOM',
            custom_label: customLabel.trim(),
            custom_emoji: customEmoji.trim(),
            custom_shape: customShape,
            custom_ink: customInk,
            country_slug: countrySlug || null,
            note: note.trim() || null,
          }
      const res = await fetch(`/api/kid/${token}/stamps/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
      setSuccess(true)
      setTimeout(() => { onClose() }, 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send suggestion')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-[2px] px-4 py-8 overflow-y-auto"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 p-1.5"
          aria-label="Close"
          disabled={submitting}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-bold text-gray-900">Suggest a stamp</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Pick the stamp you think you earned, or make one of your own. A grown-up will get the suggestion and decide.
        </p>

        {success ? (
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-5 text-center">
            <Check className="w-8 h-8 text-brand-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-brand-800">Suggestion sent.</p>
            <p className="text-xs text-brand-700 mt-1">Your grown-up will see it in their family page.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('system')}
                className={`text-sm font-semibold py-2 rounded-md ${mode === 'system' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Pick a stamp
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`text-sm font-semibold py-2 rounded-md ${mode === 'custom' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Make my own
              </button>
            </div>

            {mode === 'system' ? (
              <>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as StampType)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  {SYSTEM_STAMP_TYPES.map(t => (
                    <option key={t} value={t}>{STAMP_META[t].emoji} {STAMP_META[t].label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 -mt-1">{STAMP_META[type].description}</p>
              </>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    type="text"
                    value={customLabel}
                    onChange={e => setCustomLabel(e.target.value.slice(0, 60))}
                    placeholder="Name your stamp"
                    maxLength={60}
                    required
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
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Colour</p>
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
                {/* Live preview */}
                <div className="flex justify-center bg-sand-50 rounded-xl p-4">
                  <PassportStamp
                    label={customLabel.trim() || 'Your stamp'}
                    emoji={customEmoji.trim() || '✨'}
                    ink={customInk}
                    shape={customShape}
                    size="sm"
                  />
                </div>
              </>
            )}

            <select
              value={countrySlug}
              onChange={e => setCountrySlug(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="">Global (no country)</option>
              {packs.map(p => (
                <option key={p.slug} value={p.slug}>{p.flag} {p.country}</option>
              ))}
            </select>

            <textarea
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 500))}
              placeholder="What you did (optional)"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-y"
            />

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || (mode === 'custom' && (!customLabel.trim() || !customEmoji.trim()))}
              className="btn-primary w-full justify-center disabled:opacity-60"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                : <>Send my suggestion</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
