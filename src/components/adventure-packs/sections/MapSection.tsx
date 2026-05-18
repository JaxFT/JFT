'use client'

import type { AdventurePackData } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'
import PhotoPrompt from '../PhotoPrompt'
import { useState } from 'react'

export default function MapSection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  const visible = data.mapQuestions.filter(q => pack.ageMode === 'older' || !q.olderOnly)
  const [revealed, setRevealed] = useState<Record<number, boolean>>(() => {
    // Restore which answers were revealed last time
    const saved = pack.answers['map'] ?? {}
    const out: Record<number, boolean> = {}
    Object.entries(saved).forEach(([k, v]) => { if (k.startsWith('revealed-')) out[Number(k.slice('revealed-'.length))] = Boolean(v) })
    return out
  })

  const toggle = (i: number) => {
    const next = !revealed[i]
    setRevealed(r => ({ ...r, [i]: next }))
    pack.updateAnswer('map', `revealed-${i}`, next)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        Pull out a map of {data.country} and answer these as a family. Tap a question to reveal the answer.
      </p>
      <ul className="space-y-2">
        {visible.map((q, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              className="w-full text-left bg-sand-50 hover:bg-sand-100 border border-gray-100 rounded-lg px-4 py-3"
            >
              <p className="font-semibold text-gray-900 text-sm">{q.question}</p>
              {revealed[i] && (
                <p className="text-sm text-brand-800 mt-1.5 leading-relaxed">{q.answer}</p>
              )}
            </button>
          </li>
        ))}
      </ul>
      <PhotoPrompt prompt={`A family photo with a paper or phone map of ${data.country}, pointing to where you are now.`} />
    </div>
  )
}
