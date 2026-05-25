'use client'

// Tiny admin-only card at the top of /account showing how many tabs
// are heartbeating right now. Polls /api/admin/live-count every 20s
// so the number stays roughly current without a page refresh. Links
// out to the Cloudflare Web Analytics dashboard for deeper breakdown.

import { useEffect, useState } from 'react'
import { Activity, ExternalLink } from 'lucide-react'

const POLL_MS = 20_000
const CF_DASHBOARD_URL = 'https://dash.cloudflare.com/d8da36f93ce355293addf1f155b2afd6/dashboards/26b69e55-309a-491e-990c-412640545611'

type Stats = {
  count: number | null
  freeUsers: number | null
  premiumUsers: number | null
}

export default function LiveTrafficAdminCard() {
  const [stats, setStats] = useState<Stats>({ count: null, freeUsers: null, premiumUsers: null })
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/admin/live-count', { cache: 'no-store' })
        if (!res.ok) throw new Error('bad status')
        const json = (await res.json()) as { count?: number; freeUsers?: number; premiumUsers?: number }
        if (cancelled) return
        setStats({
          count: typeof json.count === 'number' ? json.count : 0,
          freeUsers: typeof json.freeUsers === 'number' ? json.freeUsers : 0,
          premiumUsers: typeof json.premiumUsers === 'number' ? json.premiumUsers : 0,
        })
        setError(false)
      } catch {
        if (!cancelled) setError(true)
      }
    }

    load()
    const id = window.setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const renderHeadline = () => {
    if (error) return 'Count unavailable'
    if (stats.count === null) return 'Checking…'
    return <>{stats.count} {stats.count === 1 ? 'browser tab' : 'browser tabs'} on the site</>
  }

  return (
    <div className="bg-brand-950 text-white rounded-2xl p-5 mb-8 flex items-center gap-4 flex-wrap">
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
        <Activity className="w-5 h-5 text-emerald-300" />
      </div>
      <div className="flex-1 min-w-[12rem]">
        <p className="text-[10px] font-bold tracking-widest uppercase text-white/60 mb-0.5">Admin · live traffic</p>
        <p className="font-bold text-lg leading-tight">{renderHeadline()}</p>
        {/* Member counts under the live browsers — total registered
            users split by tier. Excludes admin accounts on both lines. */}
        {!error && stats.freeUsers !== null && stats.premiumUsers !== null && (
          <p className="text-xs text-white/70 leading-relaxed mt-1">
            <span className="font-semibold text-white">{stats.premiumUsers}</span> premium
            <span className="text-white/40 mx-1.5">·</span>
            <span className="font-semibold text-white">{stats.freeUsers}</span> free
          </p>
        )}
        <p className="text-xs text-white/55 leading-relaxed mt-1">
          Updates every 20s. Admin accounts excluded.
        </p>
      </div>
      <a
        href={CF_DASHBOARD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-md"
      >
        Cloudflare analytics <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}
