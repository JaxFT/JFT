'use client'

import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import type { AdventurePackData } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'
import PhotoPrompt from '../PhotoPrompt'

export default function StoriesSection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  const visible = data.stories.filter(s => pack.ageMode === 'older' || !s.olderOnly)
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        Stories about {data.country} that are worth knowing. Read them together when you have a quiet moment.
      </p>
      <div className="space-y-2">
        {visible.map((s, i) => {
          const isOpen = openIdx === i
          return (
            <div key={i} className="bg-sand-50 border border-gray-100 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full px-4 py-3 text-left hover:bg-sand-100 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">{s.location}</p>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5">{s.question}</p>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm text-gray-700 leading-relaxed">{s.body}</p>
                  {s.thinkingQuestion && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
                      <p className="text-xs font-bold tracking-widest uppercase text-amber-800 inline-flex items-center gap-1.5 mb-1">
                        <Lightbulb className="w-3 h-3" /> Think about this…
                      </p>
                      <p className="text-sm text-amber-900 leading-relaxed">{s.thinkingQuestion}</p>
                      <textarea
                        value={pack.getAnswer<string>('stories', `thought-${i}`, '')}
                        onChange={e => pack.updateAnswer('stories', `thought-${i}`, e.target.value)}
                        rows={3}
                        placeholder="Your answer…"
                        className="mt-2 w-full text-sm px-3 py-2 bg-white border border-amber-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <PhotoPrompt prompt={`A photo of somewhere you visited in ${data.country} that connects to one of these stories.`} />
    </div>
  )
}
