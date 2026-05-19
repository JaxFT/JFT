import { Stamp as StampIcon, Globe, Trophy } from 'lucide-react'
import PassportPage from '@/components/passport/PassportPage'
import PassportStamp from '@/components/passport/PassportStamp'
import { getPackMeta } from '@/lib/adventurePackData'
import type { StampRow, KidStats } from '@/lib/passport-kid-db'
import type { PermissionMode } from '@/lib/passport-types'

export default function PassportTab({
  child,
  stats,
  stamps,
}: {
  child: { name: string; avatar: string; permission_mode: PermissionMode }
  stats: KidStats
  stamps: StampRow[]
}) {
  const recent = stamps.slice(0, 6)

  return (
    <div className="space-y-5">
      {/* Stats — a row of three "ticket stubs" with brand-accent numbers */}
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
