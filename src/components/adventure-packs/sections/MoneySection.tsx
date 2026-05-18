'use client'

import { useMemo } from 'react'
import type { AdventurePackData } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'
import PhotoPrompt from '../PhotoPrompt'

// Younger mode: auto-totals spend and shows change-vs-budget in green/red.
// Older mode: same category inputs, no auto-total. Two extra inputs ask
//             the child to work out the total spent and the change
//             themselves, with a quiet tick when their answers match
//             the actual sums (so it's a self-check, not graded).
//             Plus two checkboxes: compared prices + tried haggling.

const SPEND_CATEGORIES = [
  { key: 'souvenir', emoji: '🛍️', label: 'Souvenir' },
  { key: 'snack',    emoji: '🍪', label: 'Snack' },
  { key: 'drink',    emoji: '🥤', label: 'Drink' },
] as const
type SpendKey = typeof SPEND_CATEGORIES[number]['key']

export default function MoneySection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  const cur = data.currency
  const isOlder = pack.ageMode === 'older'

  const budget = pack.getAnswer<number | ''>('money', 'budget', cur.recommendedBudget)
  const updateBudget = (v: string) => {
    const n = v === '' ? '' : Number(v)
    pack.updateAnswer('money', 'budget', Number.isFinite(n as number) ? n : '')
  }

  const spendValues: Record<SpendKey, number | ''> = useMemo(() => {
    const out = {} as Record<SpendKey, number | ''>
    for (const c of SPEND_CATEGORIES) {
      out[c.key] = pack.getAnswer<number | ''>('money', `${c.key}-cost`, '')
    }
    return out
  }, [pack])

  const total = SPEND_CATEGORIES.reduce((sum, c) => {
    const v = spendValues[c.key]
    return sum + (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  }, 0)

  const budgetNum = typeof budget === 'number' ? budget : 0
  const change = budgetNum - total
  const overBudget = total > budgetNum && budgetNum > 0

  const comparedPrices = pack.getAnswer<boolean>('money', 'comparedPrices', false)
  const triedHaggling = pack.getAnswer<boolean>('money', 'triedHaggling', false)

  // Older-mode self-check inputs: the child works out the sums.
  const enteredTotal  = pack.getAnswer<number | ''>('money', 'enteredTotal', '')
  const enteredChange = pack.getAnswer<number | ''>('money', 'enteredChange', '')
  const totalMatches  = typeof enteredTotal === 'number' && Math.abs(enteredTotal - total) < 0.01 && total > 0
  const changeMatches = typeof enteredChange === 'number' && Math.abs(enteredChange - change) < 0.01 && budgetNum > 0

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
            {cur.budgetNote}
          </span>
        </label>

        <div className="space-y-2">
          <span className="text-xs font-bold tracking-widest uppercase text-gray-500">What you spent</span>
          {SPEND_CATEGORIES.map(c => (
            <div key={c.key} className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <span className="text-sm text-gray-700 px-3 py-2 inline-flex items-center gap-2">
                <span aria-hidden="true">{c.emoji}</span> {c.label}
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={spendValues[c.key]}
                onChange={e => {
                  const v = e.target.value
                  pack.updateAnswer('money', `${c.key}-cost`, v === '' ? '' : Number(v))
                }}
                placeholder="0"
                aria-label={`${c.label} cost in ${cur.symbol}`}
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
          <div className="space-y-3 pt-2">
            <div className="bg-white border border-gray-200 rounded-md p-3 space-y-2">
              <p className="text-xs font-bold tracking-widest uppercase text-gray-500">Your maths</p>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                <span className="text-sm text-gray-700">How much did you spend in total?</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={enteredTotal}
                  onChange={e => {
                    const v = e.target.value
                    pack.updateAnswer('money', 'enteredTotal', v === '' ? '' : Number(v))
                  }}
                  placeholder="0"
                  aria-label={`Total spent in ${cur.symbol}`}
                  className="w-24 text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
                <span className={`text-xs font-semibold w-4 ${totalMatches ? 'text-brand-700' : 'text-transparent'}`} aria-hidden="true">
                  ✓
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                <span className="text-sm text-gray-700">How much change should you have?</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={enteredChange}
                  onChange={e => {
                    const v = e.target.value
                    pack.updateAnswer('money', 'enteredChange', v === '' ? '' : Number(v))
                  }}
                  placeholder="0"
                  aria-label={`Change you should have in ${cur.symbol}`}
                  className="w-24 text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
                <span className={`text-xs font-semibold w-4 ${changeMatches ? 'text-brand-700' : 'text-transparent'}`} aria-hidden="true">
                  ✓
                </span>
              </div>
            </div>

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
