'use client'

// Tiny client island that mounts once per tab and pings /api/heartbeat
// every ~30s so the admin live-count card can show how many people
// are on the site right now. Anonymous: the session id is a random
// UUID held in sessionStorage so it dies with the tab.

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const HEARTBEAT_KEY = 'jft.live.sessionId'
const INTERVAL_MS = 30_000

function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(HEARTBEAT_KEY)
    if (existing) return existing
    const fresh = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(HEARTBEAT_KEY, fresh)
    return fresh
  } catch {
    // Private mode / blocked storage — fall back to an ephemeral id
    // that lives only for this render. Count will overcount slightly
    // for these visitors but the page still works.
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

async function ping(sessionId: string, pathname: string) {
  try {
    await fetch('/api/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, pathname }),
      // keepalive lets the final ping survive a page unload.
      keepalive: true,
    })
  } catch {
    // network blip, ignore — next interval will retry.
  }
}

export default function LiveHeartbeat({ disabled = false }: { disabled?: boolean }) {
  const pathname = usePathname()

  useEffect(() => {
    // Admin tabs skip the heartbeat so they don't inflate the live
    // browsers count the admin themselves is looking at.
    if (disabled) return
    const sessionId = getSessionId()
    // Fire immediately on mount + path change, then on the interval.
    ping(sessionId, pathname ?? '/')
    const id = window.setInterval(() => {
      ping(sessionId, pathname ?? '/')
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [pathname, disabled])

  return null
}
