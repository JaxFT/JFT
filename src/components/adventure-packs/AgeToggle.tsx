'use client'

// Two-button toggle between younger (5-7) and older (8-11) modes.
// Older mode reveals olderOnly content throughout the pack.

import { Baby, GraduationCap } from 'lucide-react'
import type { AgeMode } from '@/lib/adventurePackTypes'

export default function AgeToggle({
  value, onChange,
}: {
  value: AgeMode
  onChange: (next: AgeMode) => void
}) {
  return (
    <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
      <button
        type="button"
        onClick={() => onChange('younger')}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
          value === 'younger' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <Baby className="w-3.5 h-3.5" /> Younger kids
      </button>
      <button
        type="button"
        onClick={() => onChange('older')}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
          value === 'older' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <GraduationCap className="w-3.5 h-3.5" /> Older kids
      </button>
    </div>
  )
}
