import Link from 'next/link'
import { Stamp as StampIcon, Globe, Trophy, ArrowRight, Check, Compass } from 'lucide-react'
import PassportPage from '@/components/passport/PassportPage'
import PassportStamp from '@/components/passport/PassportStamp'
import { getPackMeta } from '@/lib/adventurePackData'
import { SECTION_KEYS } from '@/lib/adventurePackTypes'
import type { StampRow, KidStats, AssignedPackRow } from '@/lib/passport-kid-db'
import type { PermissionMode } from '@/lib/passport-types'

export default function PassportTab({
  token,
  child,
  stats,
  stamps,
  assignedPacks,
}: {
  token: string
  child: { name: string; avatar: string; permission_mode: PermissionMode }
  stats: KidStats
  stamps: StampRow[]
  assignedPacks: AssignedPackRow[]
}) {
  const recent = stamps.slice(0, 6)
  const totalSections = SECTION_KEYS.length

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Stamps', value: stats.stampCount, Icon: StampIcon },
          { label: 'Countries', value: stats.countriesUnlocked, Icon: Globe },
          { label: 'Packs', value: stats.packsCompleted, Icon: Trophy },
        ].map(s => (
          <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
            <s.Icon className="w-4 h-4 text-brand-300 mx-auto mb-1" />
            <p className="text-3xl font-bold leading-none mb-1">{s.value}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/60">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Adventure Packs — assigned packs the kid can open. Ordered:
          in progress first (most exciting), then unstarted, then
          completed. Each card cascades indented from the heading to
          read like a list flowing from the words. */}
      <section className="relative">
        <div className="flex items-center gap-2 mb-3 pl-1">
          <Compass className="w-4 h-4 text-brand-300" />
          <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-white">Adventure Packs</h2>
        </div>

        {assignedPacks.length === 0 ? (
          <div className="ml-5 bg-white/5 border border-white/10 rounded-2xl p-5 text-center text-sm text-white/70">
            <p>Ask a grown-up to add an Adventure Pack for you to start.</p>
          </div>
        ) : (
          <ul className="ml-5 border-l-2 border-brand-300/40 pl-4 space-y-2">
            {sortPacks(assignedPacks).map(p => {
              const meta = getPackMeta(p.country_slug)
              if (!meta) return null
              const done = p.missions_complete.length
              const isComplete = !!p.completed_at
              const isStarted = done > 0
              return (
                <li key={p.country_slug}>
                  <Link
                    href={`/kid/${token}/pack/${p.country_slug}`}
                    className="block bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-2xl p-4 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl leading-none" aria-hidden>{meta.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white">{meta.country}</p>
                        <p className="text-xs text-white/60 inline-flex items-center gap-1.5">
                          {isComplete
                            ? <><Check className="w-3 h-3" /> All missions complete</>
                            : isStarted
                              ? <>{done} of {totalSections} missions done</>
                              : <>Tap to start</>}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/50" />
                    </div>
                    {/* Tiny progress bar */}
                    {isStarted && !isComplete && (
                      <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-300 transition-all"
                          style={{ width: `${Math.min(100, (done / totalSections) * 100)}%` }}
                        />
                      </div>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Recent stamps preview on a cream book page */}
      <PassportPage className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <p
            className="text-xs font-extrabold uppercase tracking-[0.2em]"
            style={{ color: '#5a3a12' }}
          >
            Recent stamps
          </p>
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: '#5a3a12', opacity: 0.6 }}
          >
            {recent.length === 0 ? 'None yet' : `${recent.length} of ${stats.stampCount}`}
          </p>
        </div>

        {recent.length === 0 ? (
          <div
            className="text-center py-10 text-sm"
            style={{ color: '#5a3a12', opacity: 0.7 }}
          >
            <p className="mb-2 text-lg">Your first stamp will land here.</p>
            <p className="text-xs uppercase tracking-widest opacity-70">
              Try a food or learn a phrase in an Adventure Pack
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {recent.map(s => (
              <PassportStamp
                key={s.id}
                type={s.type}
                country={s.country_slug ? (getPackMeta(s.country_slug)?.country ?? null) : null}
                date={s.earned_at}
                size="sm"
              />
            ))}
          </div>
        )}
      </PassportPage>
    </div>
  )
}

// In progress first (kid wants to keep going), then unstarted (new
// adventures), then completed (the trophy shelf). Within each bucket
// keep the original assignment order.
function sortPacks(packs: AssignedPackRow[]): AssignedPackRow[] {
  const inProgress: AssignedPackRow[] = []
  const unstarted: AssignedPackRow[] = []
  const completed: AssignedPackRow[] = []
  for (const p of packs) {
    if (p.completed_at) completed.push(p)
    else if (p.missions_complete.length > 0) inProgress.push(p)
    else unstarted.push(p)
  }
  return [...inProgress, ...unstarted, ...completed]
}
