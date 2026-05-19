'use client'

import type { AdventurePackData } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'
import PhotoPrompt from '../PhotoPrompt'

// Spot 3+ animals on the list to earn the Animal Spotter stamp. The
// threshold is enforced server-side in passport-stamps-db, but we
// surface the count + hint here so the kid knows what they're working
// toward.
const ANIMAL_THRESHOLD = 3

export default function AnimalsSection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  const all = data.animals ?? []
  if (all.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        Animal spotter list for {data.country} is coming soon.
      </p>
    )
  }
  const visible = all.filter(a => pack.ageMode === 'older' || !a.olderOnly)
  const spotted = visible.filter((_, i) => pack.getAnswer<boolean>('animals', `spotted-${i}`, false)).length
  const stampEarned = spotted >= ANIMAL_THRESHOLD

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        Animals you might spot in {data.country}. Tick one off the moment you see it (or hear it). Spot any <strong>{ANIMAL_THRESHOLD}</strong> to earn the Animal Spotter stamp.
      </p>

      <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 ${
        stampEarned
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-sand-50 text-gray-700 border border-gray-100'
      }`}>
        <span aria-hidden>🐾</span>
        <span>
          {spotted} / {ANIMAL_THRESHOLD} spotted
          {stampEarned && ' · stamp earned!'}
        </span>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map((animal, i) => {
          const found = pack.getAnswer<boolean>('animals', `spotted-${i}`, false)
          return (
            <li key={`${i}-${animal.name}`}>
              <label className={`flex items-start gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors ${
                found ? 'bg-emerald-50 border-emerald-200' : 'bg-sand-50 border-gray-100 hover:border-brand-200'
              }`}>
                <input
                  type="checkbox"
                  checked={found}
                  onChange={e => pack.updateAnswer('animals', `spotted-${i}`, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                />
                <span className="text-2xl leading-none shrink-0">{animal.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${found ? 'text-emerald-900 line-through opacity-70' : 'text-gray-900'}`}>
                    {animal.name}
                  </p>
                  <p className="text-xs text-gray-600 leading-snug mt-0.5">{animal.description}</p>
                </div>
              </label>
            </li>
          )
        })}
      </ul>

      <PhotoPrompt prompt={`Your best photo of an animal you spotted in ${data.country}.`} />
    </div>
  )
}
