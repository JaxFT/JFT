'use client'

import { useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { Check, ExternalLink, Flag, Loader2, MessageCircle, MessageSquareText, Map, PenLine } from 'lucide-react'

type Author = { id: string; username: string | null; full_name: string | null }
export type ModerationRow = {
  id: string
  content_type: 'blog_comment' | 'recommendation_comment' | 'guestbook_entry' | 'guide_comment'
  author: Author | null
  body_snapshot: string
  context_label: string
  context_link: string
  flagged: boolean
  flagged_at: string | null
  created_at: string
}

const TYPE_ICON = {
  blog_comment: PenLine,
  recommendation_comment: MessageCircle,
  guestbook_entry: MessageSquareText,
  guide_comment: Map,
}

const TYPE_LABEL = {
  blog_comment: 'Blog',
  recommendation_comment: 'Recommendation',
  guestbook_entry: 'Guestbook',
  guide_comment: 'Guide',
}

export default function ModerationList({ initialItems }: { initialItems: ModerationRow[] }) {
  const [items, setItems] = useState(initialItems)
  const [busyId, setBusyId] = useState<string | null>(null)

  const action = async (id: string) => {
    setBusyId(id)
    const prev = items
    setItems(list => list.filter(i => i.id !== id))
    const res = await fetch(`/api/admin/moderation/${id}`, { method: 'PATCH' })
    if (!res.ok) setItems(prev)
    setBusyId(null)
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-16">Nothing pending, all caught up.</p>
  }

  return (
    <div className="space-y-2">
      {items.map(item => {
        const Icon = TYPE_ICON[item.content_type]
        const authorName = item.author?.full_name || item.author?.username || 'A member'
        return (
          <div
            key={item.id}
            className={`bg-white rounded-xl border p-4 ${item.flagged ? 'border-red-200 bg-red-50/40' : 'border-gray-100'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                    <Icon className="w-3 h-3" /> {TYPE_LABEL[item.content_type]}
                  </span>
                  {item.flagged && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-700 bg-red-100 rounded-full px-2 py-0.5">
                      <Flag className="w-3 h-3" /> Flagged
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{formatDistanceToNowStrict(new Date(item.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{authorName} · {item.context_label}</p>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words">{item.body_snapshot}</p>
                <a
                  href={item.context_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline mt-2"
                >
                  View in place <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <button
                type="button"
                onClick={() => action(item.id)}
                disabled={busyId === item.id}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-md px-3 py-1.5 shrink-0"
              >
                {busyId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Actioned
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
