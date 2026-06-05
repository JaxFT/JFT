'use client'

// Combined post-likes + comments client island for a single blog
// post. Hydrated with the SSR'd counts and comment list, then takes
// over for interactions. Pops the username modal the first time the
// viewer tries to comment or like without a username set.
//
// Comments are threaded one level deep: top-level comments each carry
// a flat list of replies. Replying to a reply attaches to the same
// top-level thread (the API flattens parent_id), so indentation never
// runs away.

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Send, Loader2, Trash2, Instagram, MessageCircle, Reply } from 'lucide-react'
import type { BlogCommentRow } from '@/lib/blog-social-db'
import UsernameModal from './UsernameModal'

type Props = {
  postSlug: string
  initialPostLikes: number
  initialPostLikedByMe: boolean
  initialComments: BlogCommentRow[]
  // Viewer state from the server. null when signed out.
  viewerUserId: string | null
  initialViewerUsername: string | null
  initialViewerUsernameIsInstagram: boolean
  initialViewerInstagram: string | null
  isAdmin: boolean
}

// Renders a username. When the user marked their handle as their
// Instagram name, we prefix '@' and link to instagram.com; otherwise
// it's plain text.
function UsernameLabel({
  username,
  isInstagram,
  className,
}: { username: string | null; isInstagram: boolean; className?: string }) {
  if (!username) return <span className={className}>anon</span>
  if (isInstagram) {
    return (
      <a
        href={`https://instagram.com/${username}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className ?? ''} hover:text-rose-600 hover:underline`}
        title={`Instagram @${username}`}
      >
        @{username}
      </a>
    )
  }
  return <span className={className}>{username}</span>
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const day = 86400000
  if (diff < day) {
    const hrs = Math.floor(diff / 3_600_000)
    if (hrs < 1) return 'just now'
    return `${hrs}h ago`
  }
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Avatar({ username, small }: { username: string | null; small?: boolean }) {
  const initials = (username ?? '?').slice(0, 2).toUpperCase()
  const size = small ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
  return (
    <div className={`${size} rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold shrink-0`}>
      {initials}
    </div>
  )
}

export default function BlogSocial({
  postSlug,
  initialPostLikes,
  initialPostLikedByMe,
  initialComments,
  viewerUserId,
  initialViewerUsername,
  initialViewerUsernameIsInstagram,
  initialViewerInstagram,
  isAdmin,
}: Props) {
  const router = useRouter()
  const [postLikes, setPostLikes] = useState(initialPostLikes)
  const [postLikedByMe, setPostLikedByMe] = useState(initialPostLikedByMe)
  const [comments, setComments] = useState<BlogCommentRow[]>(initialComments)
  const [viewerUsername, setViewerUsername] = useState(initialViewerUsername)
  const [viewerUsernameIsInstagram, setViewerUsernameIsInstagram] = useState(initialViewerUsernameIsInstagram)
  const [_, startTransition] = useTransition()

  const [usernameModalOpen, setUsernameModalOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reply state. `replyTo` holds the top-level thread we're replying
  // into plus the username being replied to (for the "Replying to…"
  // label). Only one reply box is open at a time.
  const [replyTo, setReplyTo] = useState<{ rootId: string; username: string | null } | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  // Group the flat comment list into top-level threads with replies.
  // The list arrives chronological (asc by created_at) and stays that
  // way as we append, so roots and replies keep their natural order.
  const threads = useMemo(() => {
    const roots = comments.filter(c => !c.parent_id)
    const byParent = new Map<string, BlogCommentRow[]>()
    for (const c of comments) {
      if (!c.parent_id) continue
      const arr = byParent.get(c.parent_id) ?? []
      arr.push(c)
      byParent.set(c.parent_id, arr)
    }
    return roots.map(root => ({ root, replies: byParent.get(root.id) ?? [] }))
  }, [comments])

  // Sign-in gate. Sends the user to /login with a return URL.
  const requireSignIn = () => {
    router.push(`/login?next=/blog/${postSlug}`)
  }
  const requireUsername = () => setUsernameModalOpen(true)

  // ── POST LIKE ──
  const togglePostLike = async () => {
    if (!viewerUserId) return requireSignIn()
    // Optimistic.
    const wasLiked = postLikedByMe
    setPostLikedByMe(!wasLiked)
    setPostLikes(n => n + (wasLiked ? -1 : 1))
    try {
      const r = await fetch(`/api/blog/${postSlug}/likes`, { method: 'POST' })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error)
      setPostLikedByMe(body.liked)
      setPostLikes(body.count)
    } catch {
      // Revert on failure.
      setPostLikedByMe(wasLiked)
      setPostLikes(n => n + (wasLiked ? 1 : -1))
    }
  }

  // ── COMMENT LIKE ──
  const toggleCommentLike = async (commentId: string) => {
    if (!viewerUserId) return requireSignIn()
    setComments(prev => prev.map(c => c.id === commentId
      ? { ...c, liked_by_me: !c.liked_by_me, like_count: c.like_count + (c.liked_by_me ? -1 : 1) }
      : c))
    try {
      const r = await fetch(`/api/blog/comments/${commentId}/likes`, { method: 'POST' })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error)
      setComments(prev => prev.map(c => c.id === commentId
        ? { ...c, liked_by_me: body.liked, like_count: body.count }
        : c))
    } catch {
      // Revert.
      setComments(prev => prev.map(c => c.id === commentId
        ? { ...c, liked_by_me: !c.liked_by_me, like_count: c.like_count + (c.liked_by_me ? 1 : -1) }
        : c))
    }
  }

  // Shared POST for both the top-level form and reply form. Returns the
  // hydrated comment row to slot into local state. Throws on failure
  // (callers surface the message in their own error slot).
  const postComment = async (text: string, parentId: string | null): Promise<BlogCommentRow> => {
    const r = await fetch(`/api/blog/${postSlug}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text, parent_id: parentId }),
    })
    const resp = await r.json().catch(() => ({}))
    if (!r.ok) {
      if (resp?.code === 'no_username') { requireUsername(); throw new Error('Pick a username first.') }
      throw new Error(resp.error || `Send failed (HTTP ${r.status})`)
    }
    return {
      id: resp.comment.id,
      post_slug: postSlug,
      user_id: resp.comment.user_id,
      body: resp.comment.body,
      created_at: resp.comment.created_at,
      parent_id: resp.comment.parent_id ?? null,
      username: resp.comment.username,
      username_is_instagram: viewerUsernameIsInstagram,
      instagram_handle: initialViewerInstagram,
      like_count: 0,
      liked_by_me: false,
    }
  }

  // ── TOP-LEVEL COMMENT SUBMIT ──
  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!viewerUserId) return requireSignIn()
    if (!viewerUsername) return requireUsername()
    if (draft.trim().length < 2) return
    setSubmittingComment(true)
    setSubmitError(null)
    try {
      const newComment = await postComment(draft.trim(), null)
      setComments(prev => [...prev, newComment])
      setDraft('')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setSubmittingComment(false)
    }
  }

  // ── REPLY SUBMIT ──
  const openReply = (c: BlogCommentRow) => {
    if (!viewerUserId) return requireSignIn()
    if (!viewerUsername) return requireUsername()
    // Flatten to the top-level thread: a reply to a reply still lands
    // under the same root. The API enforces this too.
    setReplyTo({ rootId: c.parent_id ?? c.id, username: c.username })
    setReplyDraft('')
    setReplyError(null)
  }

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyTo) return
    if (!viewerUserId) return requireSignIn()
    if (!viewerUsername) return requireUsername()
    if (replyDraft.trim().length < 2) return
    setSubmittingReply(true)
    setReplyError(null)
    try {
      const newComment = await postComment(replyDraft.trim(), replyTo.rootId)
      setComments(prev => [...prev, newComment])
      setReplyDraft('')
      setReplyTo(null)
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : 'Could not send')
    } finally {
      setSubmittingReply(false)
    }
  }

  // ── COMMENT DELETE ──
  const deleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return
    const prev = comments
    // Drop the comment and (if it was a top-level one) its replies.
    setComments(c => c.filter(x => x.id !== commentId && x.parent_id !== commentId))
    try {
      const r = await fetch(`/api/blog/comments/${commentId}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Delete failed')
    } catch {
      setComments(prev) // revert
    }
  }

  // Shared renderer for a single comment (top-level or reply).
  const renderComment = (c: BlogCommentRow, isReply: boolean) => {
    const canDelete = isAdmin || c.user_id === viewerUserId
    return (
      <div className="flex items-start gap-3">
        <Avatar username={c.username} small={isReply} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <UsernameLabel username={c.username} isInstagram={c.username_is_instagram} className="font-mono font-semibold text-sm text-gray-900" />
            <span className="text-xs text-gray-400 ml-auto">{fmtDate(c.created_at)}</span>
          </div>
          {/* Instagram handle: admin-only, on its own line in a
              lighter font. Server scrubs the field for non-admin
              viewers, the isAdmin guard here is belt-and-braces. */}
          {isAdmin && c.instagram_handle && (
            <a
              href={`https://instagram.com/${c.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-normal text-gray-400 hover:text-rose-600 mt-0.5"
              title={`Instagram @${c.instagram_handle}`}
            >
              <Instagram className="w-3 h-3" />
              @{c.instagram_handle}
            </a>
          )}
          <p className="text-sm text-gray-700 leading-relaxed mt-1 whitespace-pre-wrap">{c.body}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={() => toggleCommentLike(c.id)}
              className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                c.liked_by_me ? 'text-rose-600' : 'text-gray-500 hover:text-rose-600'
              }`}
              aria-pressed={c.liked_by_me}
            >
              <Heart className={`w-3.5 h-3.5 ${c.liked_by_me ? 'fill-rose-500' : ''}`} />
              <span className="tabular-nums">{c.like_count}</span>
            </button>
            <button
              type="button"
              onClick={() => openReply(c)}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-700"
            >
              <Reply className="w-3.5 h-3.5" /> Reply
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => deleteComment(c.id)}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-700"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Inline reply composer, rendered at the foot of the thread it
  // belongs to.
  const renderReplyForm = () => (
    <form onSubmit={submitReply} className="flex items-start gap-3">
      <Avatar username={viewerUsername} small />
      <div className="flex-1">
        {replyTo?.username && (
          <p className="text-xs text-gray-400 mb-1">
            Replying to <span className="font-mono font-semibold text-gray-600">{replyTo.username}</span>
          </p>
        )}
        <textarea
          value={replyDraft}
          onChange={e => setReplyDraft(e.target.value)}
          placeholder="Write a reply…"
          rows={2}
          maxLength={2000}
          autoFocus
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
        />
        {replyError && <p className="text-xs text-red-600 mt-1">{replyError}</p>}
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => { setReplyTo(null); setReplyError(null) }}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submittingReply || replyDraft.trim().length < 2}
            className="btn-primary !text-xs !py-1.5 !px-3 disabled:opacity-50"
          >
            {submittingReply
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
              : <><Send className="w-3.5 h-3.5" /> Reply</>
            }
          </button>
        </div>
      </div>
    </form>
  )

  return (
    <div className="mt-12 pt-10 border-t border-gray-200">
      {/* POST LIKE */}
      <div className="flex items-center gap-3 mb-10">
        <button
          type="button"
          onClick={togglePostLike}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border transition-colors ${
            postLikedByMe
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-rose-200 hover:text-rose-700'
          }`}
          aria-pressed={postLikedByMe}
          aria-label={postLikedByMe ? 'Unlike this post' : 'Like this post'}
        >
          <Heart className={`w-5 h-5 ${postLikedByMe ? 'fill-rose-500 text-rose-500' : ''}`} strokeWidth={2} />
          <span className="font-semibold text-sm tabular-nums">{postLikes}</span>
        </button>
        <span className="text-sm text-gray-500">
          {postLikes === 0 ? 'Be the first to like this' : postLikes === 1 ? '1 like' : `${postLikes} likes`}
        </span>
      </div>

      {/* COMMENTS HEADER */}
      {/* id + scroll margin so deep links (#comments from blog cards,
          and #comment-<id> from notification emails) land here without
          the sticky navbar covering the heading. */}
      <div id="comments" className="flex items-center gap-2 mb-6 scroll-mt-24">
        <MessageCircle className="w-5 h-5 text-brand-700" />
        <h2 className="text-xl font-bold text-gray-900">
          {comments.length === 0 ? 'No comments yet' : comments.length === 1 ? '1 comment' : `${comments.length} comments`}
        </h2>
      </div>

      {/* COMMENT FORM */}
      <form onSubmit={submitComment} className="mb-8">
        <div className="flex items-start gap-3">
          <Avatar username={viewerUsername} />
          <div className="flex-1">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={
                viewerUserId
                  ? viewerUsername
                    ? 'Add a comment…'
                    : 'Pick a username to comment…'
                  : 'Sign in to comment…'
              }
              rows={2}
              maxLength={2000}
              disabled={!viewerUserId}
              onFocus={() => {
                if (!viewerUserId) requireSignIn()
                else if (!viewerUsername) requireUsername()
              }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:cursor-not-allowed leading-relaxed"
            />
            {submitError && (
              <p className="text-xs text-red-600 mt-2">{submitError}</p>
            )}
            <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-400">
                {viewerUsername && (
                  <>Posting as <UsernameLabel username={viewerUsername} isInstagram={viewerUsernameIsInstagram} className="font-mono" /></>
                )}
              </p>
              <button
                type="submit"
                disabled={submittingComment || draft.trim().length < 2 || !viewerUserId}
                className="btn-primary !text-sm !py-2 !px-4 disabled:opacity-50"
              >
                {submittingComment
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                  : <><Send className="w-3.5 h-3.5" /> Post</>
                }
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* COMMENT LIST */}
      <ul className="space-y-6">
        {threads.map(({ root, replies }) => {
          const replyOpen = replyTo?.rootId === root.id
          return (
            <li key={root.id} id={`comment-${root.id}`} className="scroll-mt-24">
              {renderComment(root, false)}
              {(replies.length > 0 || replyOpen) && (
                <ul className="mt-4 ml-12 space-y-4 border-l-2 border-gray-100 pl-4">
                  {replies.map(r => (
                    <li key={r.id} id={`comment-${r.id}`} className="scroll-mt-24">{renderComment(r, true)}</li>
                  ))}
                  {replyOpen && <li>{renderReplyForm()}</li>}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      <UsernameModal
        open={usernameModalOpen}
        initialUsername={viewerUsername}
        initialUsernameIsInstagram={viewerUsernameIsInstagram}
        initialInstagram={initialViewerInstagram}
        isAdmin={isAdmin}
        onClose={() => setUsernameModalOpen(false)}
        onSet={({ username, username_is_instagram }) => {
          setViewerUsername(username)
          setViewerUsernameIsInstagram(username_is_instagram)
          // Reload SSR data so the new username shows on any existing comments.
          startTransition(() => router.refresh())
        }}
      />
    </div>
  )
}
