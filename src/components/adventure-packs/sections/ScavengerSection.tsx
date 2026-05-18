'use client'

import type { AdventurePackData } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'
import PhotoPrompt from '../PhotoPrompt'

export default function ScavengerSection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  const visible = data.scavengerItems.filter(i => pack.ageMode === 'older' || !i.olderOnly)
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        Spot any of these today and tick them off. {pack.ageMode === 'older' ? 'Some of these need a bit more hunting.' : 'No rush, collect them over a few days.'}
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map((item, i) => {
          const found = pack.getAnswer<boolean>('scavenger', `found-${i}-${item.label}`, false)
          return (
            <li key={`${i}-${item.label}`}>
              <label className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                found ? 'bg-brand-50 border-brand-200' : 'bg-sand-50 border-gray-100 hover:border-brand-200'
              }`}>
                <input
                  type="checkbox"
                  checked={found}
                  onChange={e => pack.updateAnswer('scavenger', `found-${i}-${item.label}`, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 shrink-0"
                />
                <span className="text-xl shrink-0">{item.emoji}</span>
                <span className={`text-sm flex-1 ${found ? 'text-brand-900 line-through opacity-70' : 'text-gray-800'}`}>
                  {item.label}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      <PhotoPrompt prompt={`Your best photo of one of these scavenger hunt spots in ${data.country}.`} />
    </div>
  )
}
