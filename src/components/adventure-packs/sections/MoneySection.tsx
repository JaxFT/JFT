'use client'

import { useMemo } from 'react'
import type { AdventurePackData } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'
import PhotoPrompt from '../PhotoPrompt'

// Younger mode: auto-totals spend and shows change-vs-budget in green/red.
// Older mode: same fields but no auto-total. Child reads the numbers.
//             Plus two extra tickboxes: compared prices + tried haggling.

const SPEND_KEYS = ['item1', 'item2', 'item3', 'item4'] as const
type SpendKey = typeof SPEND_KEYS[number]

export default function MoneySection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  const cur = data.currency
  const isOlder = pack.ageMode === 'older'

  const budget = pack.getAnswer<number | ''>('money', 'budget', cur.recommendedBudget)
  const updateBudget = (v: string) => {
    const n = v === '' ? '' : Number(v)
    pack.updateAnswer('money', 'budget', Number.isFinite(n as number) ? n : '')
  }

  const spendValues: Record<SpendKey, { name: string; cost: number | '' }> = useMemo(() => {
    const out = {} as Record<SpendKey, { name: string; cost: number | '' }>
    for (const k of SPEND_KEYS) {
      out[k] = {
        name: pack.getAnswer<string>('money', `${k}-name`, ''),
        cost: pack.getAnswer<number | ''>('money', `${k}-cost`, ''),
      }
    }
    return out
  }, [pack])

  const total = SPEND_KEYS.reduce((sum, k) => {
    const c = spendValues[k].cost
    return sum + (typeof c === 'number' && Number.isFinite(c) ? c : 0)
  }, 0)

  const budgetNum = typeof budget === 'number' ? budget : 0
  const change = budgetNum - total
  const overBudget = total > budgetNum && budgetNum > 0

  const comparedPrices = pack.getAnswer<boolean>('money', 'comparedPrices', false)
  const triedHaggling = pack.getAnswer<boolean>('money', 'triedHaggling', false)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 leading-relaxed">
        Today&apos;s mission: be in charge of {cur.code} for one snack or souvenir. Parent sets the budget, you do the rest.
      </p>

      <div className="bg-sand-50 border border-gray-100 rounded-lg p-4 space-y-3">
        <label className="block">
          <span className="text-xs font-bold tracking-widest uppercase text-gray-500">Today&apos;s budget ({cur.symbol})</span>
          <input
            type="number"
            inputMode="decimal"
            value={budget}
            onChange={e => updateBudget(e.target.value)}
            className="mt-1 w-full text-base px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder={String(cur.recommendedBudget)}
          />
          <span className="text-xs text-gray-400 mt-1 block">
            {cur.budgetNote} · 1 GBP ≈ {cur.approxGBP} {cur.symbol}
          </span>
        </label>

        <div className="space-y-2">
          <span className="text-xs font-bold tracking-widest uppercase text-gray-500">What you spent</span>
          {SPEND_KEYS.map((k, i) => (
            <div key={k} className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="text"
                value={spendValues[k].name}
                onChange={e => pack.updateAnswer('money', `${k}-name`, e.target.value)}
                placeholder={`Item ${i + 1}`}
                className="text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <input
                type="number"
                inputMode="decimal"
                value={spendValues[k].cost}
                onChange={e => {
                  const v = e.target.value
                  pack.updateAnswer('money', `${k}-cost`, v === '' ? '' : Number(v))
                }}
                placeholder="0"
                className="w-24 text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          ))}
        </div>

        {!isOlder && budgetNum > 0 && (
          <div className={`text-sm font-semibold rounded-md px-3 py-2 ${
            overBudget ? 'bg-red-50 text-red-800' : 'bg-brand-50 text-brand-800'
          }`}>
            {overBudget
              ? <>Over budget by {(total - budgetNum).toFixed(2)} {cur.symbol}</>
              : <>Spent: {total.toFixed(2)} {cur.symbol} &middot; Change: {change.toFixed(2)} {cur.symbol}</>}
          </div>
        )}

        {isOlder && (
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={comparedPrices}
                onChange={e => pack.updateAnswer('money', 'comparedPrices', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Compared prices at 2 different stalls
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={triedHaggling}
                onChange={e => pack.updateAnswer('money', 'triedHaggling', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Tried haggling
            </label>
          </div>
        )}
      </div>

      <PhotoPrompt prompt={`A photo of you holding ${cur.code} cash, or paying for something yourself.`} />
    </div>
  )
}
