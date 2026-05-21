// Adventure Passport section, lifted out of /family so we can render it
// inline on /account (we removed the separate /family tab — bookmarks
// to /family now redirect to /account).

import Link from 'next/link'
import { Users, ArrowRight, Plus, Stamp, MapPin, Trophy, Plane } from 'lucide-react'
import { listChildrenForParent, getStatsForChildren } from '@/lib/passport-db'
import { PERMISSION_LABELS } from '@/lib/passport-types'
import AddChildForm from '../family/AddChildForm'

export default async function AdventurePassportSection() {
  const children = await listChildrenForParent()
  const stats = await getStatsForChildren(children.map(c => c.id))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Adventure Passport</h2>
      </div>

      {children.length === 0 ? (
        // Quiet, neutral empty state. The previous version shoved an
        // emoji + "add your first child" callout that landed badly for
        // anyone who doesn't have (or hasn't added) kids yet. Just an
        // expandable "Add a child" panel — no pressure to use it.
        <details className="border border-gray-100 rounded-xl group">
          <summary className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 px-4 py-3">
            <Plus className="w-4 h-4 text-brand-600" /> Add a child
          </summary>
          <div className="px-4 pb-4 pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3">
              Each child gets their own QR-coded passport, stamps and country map.
            </p>
            <AddChildForm />
          </div>
        </details>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {children.map(c => {
              const s = stats[c.id] ?? { stampCount: 0, countriesUnlocked: 0, packsCompleted: 0 }
              return (
                <Link
                  key={c.id}
                  href={`/family/${c.id}`}
                  className="bg-sand-50 rounded-xl border border-gray-100 p-4 hover:border-brand-200 hover:bg-white transition-all flex flex-col"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl leading-none">{c.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{c.name}</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">{PERMISSION_LABELS[c.permission_mode]}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-auto text-center">
                    <div className="bg-white rounded-md py-1.5">
                      <p className="text-[10px] text-gray-500 inline-flex items-center gap-0.5 justify-center">
                        <Stamp className="w-2.5 h-2.5" /> Stamps
                      </p>
                      <p className="font-bold text-sm text-gray-900">{s.stampCount}</p>
                    </div>
                    <div className="bg-white rounded-md py-1.5">
                      <p className="text-[10px] text-gray-500 inline-flex items-center gap-0.5 justify-center">
                        <MapPin className="w-2.5 h-2.5" /> Visited
                      </p>
                      <p className="font-bold text-sm text-gray-900">{s.countriesUnlocked}</p>
                    </div>
                    <div className="bg-white rounded-md py-1.5">
                      <p className="text-[10px] text-gray-500 inline-flex items-center gap-0.5 justify-center">
                        <Trophy className="w-2.5 h-2.5" /> Packs
                      </p>
                      <p className="font-bold text-sm text-gray-900">{s.packsCompleted}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <details className="border border-gray-100 rounded-xl group mb-3">
            <summary className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 px-4 py-3">
              <Plus className="w-4 h-4 text-brand-600" /> Add another child
            </summary>
            <div className="px-4 pb-4 pt-1 border-t border-gray-100">
              <AddChildForm />
            </div>
          </details>

          <Link
            href="/family/flights"
            className="block bg-sand-50 hover:bg-white rounded-xl border border-gray-100 hover:border-brand-200 p-4 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="bg-brand-50 text-brand-700 rounded-lg p-2">
                <Plane className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">Family flights</p>
                <p className="text-xs text-gray-500">Log every flight to earn Brave Traveller stamps.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        </>
      )}
    </div>
  )
}
