'use client'

import { useState } from 'react'
import type { AdventurePackData } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'
import { ChevronDown, ChevronUp } from 'lucide-react'

// Five sense cards (Smell / Hear / Taste / Feel / See), each tappable
// to expand into a textarea with a country-specific placeholder. Plus
// a sixth always-visible "What surprised you most today?" textarea.
// No age difference here. Same content for everyone.

type SenseKey = 'smell' | 'hear' | 'taste' | 'feel' | 'see'
const SENSE_META: Array<{ key: SenseKey; label: string; emoji: string }> = [
  { key: 'smell', label: 'Smell', emoji: '👃' },
  { key: 'hear',  label: 'Hear',  emoji: '👂' },
  { key: 'taste', label: 'Taste', emoji: '👅' },
  { key: 'feel',  label: 'Feel',  emoji: '✋' },
  { key: 'see',   label: 'See',   emoji: '👁️' },
]

export default function SensesSection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  const [open, setOpen] = useState<Record<SenseKey, boolean>>(() => {
    // Default any sense with existing text to open
    const out: Record<SenseKey, boolean> = { smell: false, hear: false, taste: false, feel: false, see: false }
    for (const m of SENSE_META) {
      const existing = pack.getAnswer<string>('senses', m.key, '')
      if (existing.trim().length > 0) out[m.key] = true
    }
    return out
  })

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        Stop for a minute and tune in. Tap each sense to add a note about what you noticed.
      </p>

      <div className="space-y-2">
        {SENSE_META.map(m => {
          const isOpen = open[m.key]
          const value = pack.getAnswer<string>('senses', m.key, '')
          const placeholder = data.senses[m.key]
          return (
            <div key={m.key} className="bg-sand-50 border border-gray-100 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(o => ({ ...o, [m.key]: !o[m.key] }))}
                className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-sand-100"
              >
                <span className="inline-flex items-center gap-2.5 text-left">
                  <span className="text-2xl">{m.emoji}</span>
                  <span>
                    <span className="block font-semibold text-gray-900 text-sm">{m.label}</span>
                    {!isOpen && value.trim() && (
                      <span className="block text-xs text-gray-500 mt-0.5 line-clamp-1">{value}</span>
                    )}
                  </span>
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-3">
                  <textarea
                    value={value}
                    onChange={e => pack.updateAnswer('senses', m.key, e.target.value)}
                    rows={3}
                    placeholder={placeholder}
                    className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div>
        <label className="block">
          <span className="text-xs font-bold tracking-widest uppercase text-gray-500">What surprised you most today?</span>
          <textarea
            value={pack.getAnswer<string>('senses', 'surprised', '')}
            onChange={e => pack.updateAnswer('senses', 'surprised', e.target.value)}
            rows={3}
            placeholder="Something you didn't expect. Funny, beautiful, weird, anything…"
            className="mt-1 w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
          />
        </label>
      </div>
    </div>
  )
}
