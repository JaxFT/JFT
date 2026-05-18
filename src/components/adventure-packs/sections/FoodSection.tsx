'use client'

import { Star } from 'lucide-react'
import type { AdventurePackData } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'
import PhotoPrompt from '../PhotoPrompt'

export default function FoodSection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        Try as many as you can. Tap the stars to rate after tasting.
      </p>
      <ul className="space-y-2">
        {data.foods.map(f => {
          const tried = pack.getAnswer<boolean>('food', `tried-${f.name}`, false)
          const rating = pack.getAnswer<number>('food', `rating-${f.name}`, 0)
          return (
            <li key={f.name} className="bg-sand-50 border border-gray-100 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{f.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{f.name}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{f.description}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={tried}
                        onChange={e => pack.updateAnswer('food', `tried-${f.name}`, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      Tried it
                    </label>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => pack.updateAnswer('food', `rating-${f.name}`, rating === n ? 0 : n)}
                          aria-label={`Rate ${n} of 5`}
                          className="p-1 -mx-0.5"
                        >
                          <Star className={`w-4 h-4 ${rating >= n ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <PhotoPrompt prompt={`A close-up of your favourite ${data.country} food today — bonus points if you're holding it up to the camera.`} />
    </div>
  )
}
