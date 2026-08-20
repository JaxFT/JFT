'use client'

// Votes, comments and edits are kept as local state seeded from
// server-fetched props rather than lifted to the parent list —
// nothing else on the page depends on a card's live counts or fields,
// so there's no need to plumb updates back up through
// RecommendationsBrowser/FavouritePlacesSection just to keep two
// copies of the same data in sync. One consequence: editing a card's
// country/town won't re-sort it out of an active country filter until
// the page is reloaded, an acceptable rough edge for now.

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, ExternalLink, Flag, Link2, MapPin, MessageCircle, Pencil, Star, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { getCountryByIso2 } from '@/lib/countries'
import { shortName } from '@/lib/display-name'
import CountryFlag from '@/components/CountryFlag'
import RecommendationForm, { type NewRecommendationInput } from './RecommendationForm'
import type { Recommendation, RecommendationComment } from './types'

export default function RecommendationCard({
  rec,
  showAuthor,
  canInteract = true,
  canEdit = false,
  onRemove,
}: {
  rec: Recommendation
  showAuthor?: boolean
  canInteract?: boolean
  canEdit?: boolean
  onRemove?: (id: string) => void
}) {
  const [fields, setFields] = useState({
    category: rec.category, place_name: rec.place_name, iso2: rec.iso2, town: rec.town,
    google_maps_url: rec.google_maps_url ?? '', link_url: rec.link_url ?? '', link_label: rec.link_label ?? '',
    date_visited: rec.date_visited ?? '', rating: rec.rating, note: rec.note ?? '',
  })
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState('')
  const [blogLink, setBlogLink] = useState(rec.blog_link)
  const [author, setAuthor] = useState(rec.author)

  const country = getCountryByIso2(fields.iso2)
  const authorName = shortName(author?.full_name) || author?.username || 'A member'

  const [upVotes, setUpVotes] = useState(rec.up_votes)
  const [downVotes, setDownVotes] = useState(rec.down_votes)
  const [myVote, setMyVote] = useState(rec.my_vote)
  const [voting, setVoting] = useState(false)

  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<RecommendationComment[] | null>(null)
  const [flaggedCommentIds, setFlaggedCommentIds] = useState<Set<string>>(new Set())
  const [commentCount, setCommentCount] = useState(rec.comment_count)
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const saveEdit = async (input: NewRecommendationInput): Promise<string | void> => {
    setEditError('')
    try {
      const res = await fetch('/api/recommendations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rec.id, ...input }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { setEditError(body.error || 'Could not save changes'); return body.error || 'Could not save changes' }
      setFields({
        category: body.recommendation.category, place_name: body.recommendation.place_name,
        iso2: body.recommendation.iso2, town: body.recommendation.town,
        google_maps_url: body.recommendation.google_maps_url ?? '', link_url: body.recommendation.link_url ?? '',
        link_label: body.recommendation.link_label ?? '', date_visited: body.recommendation.date_visited ?? '',
        rating: body.recommendation.rating, note: body.recommendation.note ?? '',
      })
      setBlogLink(body.recommendation.blog_link ?? null)
      // Only present on an admin-reassignment edit — a same-author edit
      // doesn't touch attribution, so leave the existing author as-is.
      if (body.recommendation.author) setAuthor(body.recommendation.author)
      setEditing(false)
    } catch {
      setEditError('Could not save changes')
      return 'Could not save changes'
    }
  }

  const vote = async (value: 1 | -1) => {
    if (voting) return
    if (!canInteract) { window.location.href = '/login?next=/recommendations'; return }
    setVoting(true)
    const prevUp = upVotes, prevDown = downVotes, prevMine = myVote
    // Optimistic update matching the server's toggle logic.
    if (myVote === value) {
      setMyVote(null)
      if (value === 1) setUpVotes(v => v - 1); else setDownVotes(v => v - 1)
    } else {
      setMyVote(value)
      if (value === 1) { setUpVotes(v => v + 1); if (prevMine === -1) setDownVotes(v => v - 1) }
      else { setDownVotes(v => v + 1); if (prevMine === 1) setUpVotes(v => v - 1) }
    }
    try {
      const res = await fetch(`/api/recommendations/${rec.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error()
      setUpVotes(body.up_votes)
      setDownVotes(body.down_votes)
      setMyVote(body.my_vote)
    } catch {
      setUpVotes(prevUp); setDownVotes(prevDown); setMyVote(prevMine)
    } finally {
      setVoting(false)
    }
  }

  const openComments = async () => {
    setCommentsOpen(o => !o)
    if (comments !== null) return
    setLoadingComments(true)
    try {
      const res = await fetch(`/api/recommendations/${rec.id}/comments`)
      const body = await res.json().catch(() => ({}))
      setComments(res.ok ? body.comments : [])
    } catch {
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  const postComment = async () => {
    const text = newComment.trim()
    if (!text || postingComment) return
    if (!canInteract) { window.location.href = '/login?next=/recommendations'; return }
    setPostingComment(true)
    try {
      const res = await fetch(`/api/recommendations/${rec.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error()
      setComments(prev => [...(prev ?? []), body.comment])
      setCommentCount(c => c + 1)
      setNewComment('')
    } catch {
      // swallow — the textarea keeps its text so they can retry
    } finally {
      setPostingComment(false)
    }
  }

  const flagComment = async (commentId: string) => {
    setFlaggedCommentIds(prev => new Set(prev).add(commentId))
    const res = await fetch('/api/moderation/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_type: 'recommendation_comment', content_id: commentId }),
    })
    if (!res.ok) setFlaggedCommentIds(prev => { const next = new Set(prev); next.delete(commentId); return next })
  }

  if (editing) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-1">
        {editError && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 m-3 mb-0">{editError}</p>}
        <RecommendationForm
          initialValues={fields}
          submitLabel="Save changes"
          onSubmit={saveEdit}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-gray-900 truncate">{fields.place_name}</p>
            <div className="flex items-center shrink-0">
              {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} className={`w-3.5 h-3.5 ${n <= fields.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <CountryFlag iso2={fields.iso2} ariaHidden size="xs" />
            {fields.town}, {country?.name ?? fields.iso2.toUpperCase()}
            {fields.date_visited && <span className="text-gray-400">· {new Date(fields.date_visited).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>}
          </p>
          {fields.note && <p className="text-sm text-gray-600 mt-1.5">{fields.note}</p>}

          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {fields.link_url && fields.link_label && (
              <a
                href={fields.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
              >
                <Link2 className="w-3 h-3" /> {fields.link_label} <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {fields.google_maps_url && (
              <a
                href={fields.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
              >
                <MapPin className="w-3 h-3" /> Google Maps <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {blogLink && (
              <Link
                href={`/blog/${blogLink.slug}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
              >
                <BookOpen className="w-3 h-3" /> We wrote about this
              </Link>
            )}
            {showAuthor && <span className="text-xs text-gray-400">Added by {authorName}</span>}

            <div className="flex items-center gap-1 ml-auto">
              {canInteract ? (
                <>
                  <button
                    type="button"
                    onClick={() => vote(1)}
                    disabled={voting}
                    aria-pressed={myVote === 1}
                    aria-label="Agree, I've been and it's great"
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${
                      myVote === 1 ? 'bg-brand-50 text-brand-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> {upVotes}
                  </button>
                  <button
                    type="button"
                    onClick={() => vote(-1)}
                    disabled={voting}
                    aria-pressed={myVote === -1}
                    aria-label="Disagree"
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${
                      myVote === -1 ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> {downVotes}
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs text-gray-400">
                  <ThumbsUp className="w-3.5 h-3.5" /> {upVotes} <ThumbsDown className="w-3.5 h-3.5" /> {downVotes}
                </span>
              )}
              <button
                type="button"
                onClick={openComments}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              >
                <MessageCircle className="w-3.5 h-3.5" /> {commentCount}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-gray-400 hover:text-brand-600 p-1"
              aria-label={`Edit ${fields.place_name}`}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(rec.id)}
              className="text-gray-400 hover:text-red-600 p-1"
              aria-label={`Remove ${fields.place_name}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {commentsOpen && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-2.5">
          {loadingComments ? (
            <p className="text-xs text-gray-400">Loading comments…</p>
          ) : comments && comments.length > 0 ? (
            comments.map(c => (
              <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
                <p>
                  <span className="font-semibold text-gray-800">{shortName(c.author?.full_name) || c.author?.username || 'A member'}</span>
                  <span className="text-gray-600"> {c.body}</span>
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => flagComment(c.id)}
                    disabled={flaggedCommentIds.has(c.id)}
                    className={`p-0.5 shrink-0 ${flaggedCommentIds.has(c.id) ? 'text-red-500' : 'text-gray-300 hover:text-red-500'}`}
                    aria-label={flaggedCommentIds.has(c.id) ? 'Flagged for review' : 'Flag for review'}
                    title={flaggedCommentIds.has(c.id) ? 'Flagged for review' : 'Flag for review'}
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">No comments yet.</p>
          )}
          {canInteract ? (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value.slice(0, 500))}
                onKeyDown={e => { if (e.key === 'Enter') postComment() }}
                placeholder="Add a comment…"
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={postComment}
                disabled={postingComment || !newComment.trim()}
                className="text-xs font-semibold text-brand-600 hover:text-brand-800 disabled:opacity-50 px-2"
              >
                Post
              </button>
            </div>
          ) : (
            <Link href="/login?next=/recommendations" className="text-xs font-semibold text-brand-600 hover:underline">
              Sign in to comment
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
