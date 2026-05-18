'use client'

// Dispatcher — picks the right section component based on key, wraps
// each one in a consistent shell (heading, mark-complete button).

import { Check } from 'lucide-react'
import type { AdventurePackData, SectionKey } from '@/lib/adventurePackTypes'
import { SECTION_LABELS } from '@/lib/adventurePackTypes'
import type { PackHook } from './PackShell'
import MapSection from './sections/MapSection'
import LanguageSection from './sections/LanguageSection'
import MoneySection from './sections/MoneySection'
import FoodSection from './sections/FoodSection'
import GeographySection from './sections/GeographySection'
import ScavengerSection from './sections/ScavengerSection'
import SensesSection from './sections/SensesSection'
import StoriesSection from './sections/StoriesSection'
import ConvoSection from './sections/ConvoSection'

type Props = {
  sectionKey: SectionKey
  data: AdventurePackData
  pack: PackHook
}

export default function PackSection({ sectionKey, data, pack }: Props) {
  const done = pack.isMissionComplete(sectionKey)

  const inner = (() => {
    switch (sectionKey) {
      case 'map':       return <MapSection data={data} pack={pack} />
      case 'language':  return <LanguageSection data={data} pack={pack} />
      case 'money':     return <MoneySection data={data} pack={pack} />
      case 'food':      return <FoodSection data={data} pack={pack} />
      case 'geography': return <GeographySection data={data} pack={pack} />
      case 'scavenger': return <ScavengerSection data={data} pack={pack} />
      case 'senses':    return <SensesSection data={data} pack={pack} />
      case 'stories':   return <StoriesSection data={data} pack={pack} />
      case 'convo':     return <ConvoSection data={data} pack={pack} />
    }
  })()

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <header className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-gray-900">{SECTION_LABELS[sectionKey]}</h2>
        <button
          type="button"
          onClick={() => pack.completeMission(sectionKey)}
          disabled={done}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
            done
              ? 'bg-brand-100 text-brand-800 cursor-default'
              : 'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          {done ? 'Mission complete' : 'Mark mission complete'}
        </button>
      </header>
      <div className="p-5 sm:p-6 space-y-4">
        {inner}
      </div>
    </section>
  )
}
