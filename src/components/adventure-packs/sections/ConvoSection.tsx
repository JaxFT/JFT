'use client'

import type { AdventurePackData } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'
import { MessageCircle } from 'lucide-react'

export default function ConvoSection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  const visible = data.convoQuestions.filter(q => pack.ageMode === 'older' || !q.olderOnly)
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        Family conversation cards — pull one out over dinner or on a long walk. Jot answers below if you want to remember them.
      </p>
      <div className="space-y-2">
        {visible.map((q, i) => (
          <div key={i} className="bg-sand-50 border border-gray-100 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 flex items-start gap-2">
              <MessageCircle className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
              <span>{q.question}</span>
            </p>
            <textarea
              value={pack.getAnswer<string>('convo', `note-${i}`, '')}
              onChange={e => pack.updateAnswer('convo', `note-${i}`, e.target.value)}
              rows={2}
              placeholder="What did everyone say?"
              className="mt-2 w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
