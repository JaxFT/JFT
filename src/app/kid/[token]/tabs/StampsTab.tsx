import PassportPage from '@/components/passport/PassportPage'
import PassportStamp from '@/components/passport/PassportStamp'
import { getPackMeta } from '@/lib/adventurePackData'
import type { StampRow } from '@/lib/passport-kid-db'

export default function StampsTab({ stamps }: { stamps: StampRow[] }) {
  return (
    <PassportPage className="p-6 sm:p-8 min-h-[60vh]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p
            className="text-xs font-extrabold uppercase tracking-[0.2em]"
            style={{ color: '#5a3a12' }}
          >
            Stamp collection
          </p>
          <p
            className="text-xs uppercase tracking-widest mt-0.5"
            style={{ color: '#5a3a12', opacity: 0.6 }}
          >
            {stamps.length === 0 ? 'Empty page' : `${stamps.length} ${stamps.length === 1 ? 'stamp' : 'stamps'}`}
          </p>
        </div>
      </div>

      {stamps.length === 0 ? (
        <div
          className="text-center py-16 text-sm"
          style={{ color: '#5a3a12', opacity: 0.75 }}
        >
          <p className="text-lg font-semibold mb-2">No stamps yet.</p>
          <p className="text-xs uppercase tracking-widest opacity-70 max-w-xs mx-auto leading-relaxed">
            Pick a food, learn a phrase, or finish a mission. Your first stamp will be pressed here.
          </p>
        </div>
      ) : (
        // Slight jitter on positions via flex-wrap with a random-feeling
        // gap pattern. Each stamp self-rotates based on its type, so
        // the whole page looks hand-pressed.
        <div className="flex flex-wrap items-start justify-center gap-x-4 gap-y-5 py-3">
          {stamps.map(s => (
            <PassportStamp
              key={s.id}
              type={s.type}
              country={s.country_slug ? (getPackMeta(s.country_slug)?.country ?? null) : null}
              date={s.earned_at}
              size="md"
            />
          ))}
        </div>
      )}
    </PassportPage>
  )
}
