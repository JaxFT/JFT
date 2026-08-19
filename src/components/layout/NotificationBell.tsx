'use client'

// In-app notification bell, mounted in the Navbar for signed-in
// users. Polls every 60s for a fresh unread count rather than
// anything real-time — fine at this site's scale, and avoids the
// complexity of websockets/Supabase Realtime for what's currently a
// handful of accounts.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNowStrict } from 'date-fns'
import { Bell } from 'lucide-react'

type Notification = { id: string; type: string; message: string; link: string; read_at: string | null; created_at: string }

export default function NotificationBell({ transparent = false }: { transparent?: boolean }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const body = await res.json()
      setNotifications(body.notifications ?? [])
      setUnreadCount(body.unreadCount ?? 0)
      setLoaded(true)
    } catch { /* ignore, next poll will retry */ }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const togglePanel = () => {
    setOpen(o => !o)
    if (!loaded) fetchNotifications()
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    setUnreadCount(0)
    await fetch('/api/notifications/mark-read', { method: 'POST' }).catch(() => {})
  }

  const clickNotification = (n: Notification) => {
    setOpen(false)
    if (!n.read_at) {
      setUnreadCount(c => Math.max(0, c - 1))
      fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {})
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={togglePanel}
        className={`relative p-2 transition-colors ${
          unreadCount > 0
            ? transparent ? 'text-white' : 'text-brand-600 hover:text-brand-700'
            : transparent ? 'text-white/80 hover:text-white' : 'text-gray-500 hover:text-gray-900'
        }`}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'fill-current' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-lg border border-gray-100 z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 sticky top-0 bg-white">
            <p className="text-sm font-bold text-gray-900">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-semibold text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {notifications.map(n => (
                <li key={n.id}>
                  <Link
                    href={n.link}
                    onClick={() => clickNotification(n)}
                    className={`block px-4 py-3 text-sm hover:bg-gray-50 ${!n.read_at ? 'bg-brand-50/60' : ''}`}
                  >
                    <p className="text-gray-800">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDistanceToNowStrict(new Date(n.created_at), { addSuffix: true })}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
