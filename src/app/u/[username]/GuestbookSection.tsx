'use client'

// MySpace-style comment wall on a public Travel Profile. Signed-in
// visitors leave a short message; the page owner (or the author, or a
// site admin) can delete any entry. No auto-expiry, see
// supabase/travel-profile-guestbook.sql for why.

import { useState } from 'react'
import Link from 'next/link'
import { Flag, Loader2, MessageSquareText, X } from 'lucide-react'
import { shortName } from '@/lib/display-name'

type Author = { id: string; username: string | null; full_name: string | null }
export type GuestbookEntry = { id: string; profile_user_id: string; author_user_id: string; body: string; created_at: string; author: Author | null }

export default function GuestbookSection({
  profileUserId,
  initialEntries,
  initialHasMore,
  viewerId,
  isOwner,
}: {
  profileUserId: string
  initialEntries: GuestbookEntry[]
  initialHasMore: boolean
  viewerId: string | null
  isOwner: boolean
}) {
  const [entries, setEntries] = useState(initialEntries)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingMore, setLoadingMore] = useState(false)
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set())

  const loadMore = async () => {
    const oldest = entries[entries.length - 1]?.created_at
    if (!oldest) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/travel-profile/guestbook?user=${profileUserId}&before=${encodeURIComponent(oldest)}`)
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setEntries(prev => [...prev, ...body.entries])
        setHasMore(body.hasMore)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const post = async () => {
    const text = message.trim()
    if (!text || posting) return
    setError('')
    setPosting(true)
    try {
      const res = await fetch('/api/travel-profile/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_user_id: profileUserId, body: text }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not post that')
      setEntries(prev => [body.entry, ...prev])
      setMessage('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post that')
    } finally {
      setPosting(false)
    }
  }

  const remove = async (id: string) => {
    const prev = entries
    setEntries(list => list.filter(e => e.id !== id))
    const res = await fetch(`/api/travel-profile/guestbook?id=${id}`, { method: 'DELETE' })
    if (!res.ok) setEntries(prev)
  }

  const flag = async (id: string) => {
    setFlaggedIds(prev => new Set(prev).add(id))
    const res = await fetch('/api/moderation/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_type: 'guestbook_entry', content_id: id }),
    })
    if (!res.ok) setFlaggedIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  return (
    <div className="mb-6">
      <p className="text-xs font-bold tracking-widest uppercase text-white/80 mb-3 flex items-center gap-1.5">
        <MessageSquareText className="w-4 h-4" /> Guestbook
      </p>

      {viewerId ? (
        <div className="bg-white rounded-2xl p-3 mb-3">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="Leave a message…"
            spellCheck
            lang="en"
            className="w-full px-2 py-1.5 text-sm border-0 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between">
            {error && <p className="text-xs text-red-700">{error}</p>}
            <button
              type="button"
              onClick={post}
              disabled={posting || !message.trim()}
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-3 py-1.5 rounded-md"
            >
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Post
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/10 rounded-2xl p-3 mb-3 text-center">
          <Link href="/login" className="text-sm font-semibold text-white hover:underline">
            Sign in to leave a message
          </Link>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-white/60 italic">No messages yet, be the first.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(e => {
            const name = shortName(e.author?.full_name) || e.author?.username || 'A member'
            const canDelete = viewerId && (viewerId === e.author_user_id || isOwner)
            const canFlag = isOwner && viewerId !== e.author_user_id
            const isFlagged = flaggedIds.has(e.id)
            return (
              <div key={e.id} className="bg-white rounded-xl px-3.5 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold text-gray-900">{name}</span> {e.body}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    {canFlag && (
                      <button
                        type="button"
                        onClick={() => flag(e.id)}
                        disabled={isFlagged}
                        className={`p-0.5 ${isFlagged ? 'text-red-500' : 'text-gray-300 hover:text-red-500'}`}
                        aria-label={isFlagged ? 'Flagged for review' : 'Flag for review'}
                        title={isFlagged ? 'Flagged for review' : 'Flag for review'}
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => remove(e.id)}
                        className="text-gray-300 hover:text-red-600 p-0.5"
                        aria-label="Delete message"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )
          })}
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full text-center text-xs font-semibold text-white/70 hover:text-white py-2"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
