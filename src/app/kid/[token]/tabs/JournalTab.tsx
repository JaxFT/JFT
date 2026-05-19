'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, X, Check } from 'lucide-react'
import PassportPage from '@/components/passport/PassportPage'
import { getPackMeta } from '@/lib/adventurePackData'
import type { PermissionMode } from '@/lib/passport-types'
import type { JournalEntryRow } from '@/lib/passport-journal-db'

// Five emoji feelings for the rating selector. Keeping it small and
// kid-friendly. Order: best → worst.
const EMOJI_FEELINGS = ['😍', '😊', '😐', '😕', '😴'] as const

// Guided-mode prompts. Six is enough to feel varied without being a
// wall of choices. They're tuned for travel and family memory.
const GUIDED_PROMPTS = [
  { emoji: '👀', label: 'Best thing I saw today' },
  { emoji: '😂', label: 'Something funny that happened' },
  { emoji: '🍽️', label: 'Did I try a new food? What was it?' },
  { emoji: '🗣️', label: 'Did I learn a new word? What was it?' },
  { emoji: '🤔', label: 'Most surprising thing today' },
  { emoji: '💛', label: 'Someone I will remember' },
]

export default function JournalTab({
  token,
  childName,
  permissionMode,
  entries: initialEntries,
}: {
  token: string
  childName: string
  permissionMode: PermissionMode
  entries: JournalEntryRow[]
}) {
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntryRow[]>(initialEntries)

  // Composer state. activePrompt is null when no prompt has been
  // tapped yet (Guided) or when in Creator mode (always open).
  const [activePrompt, setActivePrompt] = useState<string | null>(
    permissionMode === 'creator' ? '' : null,
  )
  const [text, setText] = useState('')
  const [emoji, setEmoji] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canWrite = permissionMode !== 'view'

  const startPrompt = (label: string) => {
    setActivePrompt(label)
    setText('')
    setEmoji('')
    setError(null)
  }

  const cancel = () => {
    setActivePrompt(permissionMode === 'creator' ? '' : null)
    setText('')
    setEmoji('')
    setError(null)
  }

  const save = async () => {
    if (!text.trim() && !emoji) {
      setError('Write something or pick an emoji first.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // Combine the prompt and the answer into the stored text so it
      // reads back like a real journal page later. Guided saves get
      // "Prompt label\n\nAnswer". Creator saves just store the body.
      const combined = activePrompt
        ? `${activePrompt}\n\n${text.trim()}`
        : text.trim()
      const res = await fetch(`/api/kid/${token}/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: combined || null,
          emoji_rating: emoji || null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      // Optimistically insert the new entry at the top of the list
      // so the kid immediately sees their entry land in the book.
      setEntries(prev => [{
        id: body.id ?? `tmp-${Date.now()}`,
        child_id: '',
        country_slug: null,
        text: combined || null,
        emoji_rating: emoji || null,
        created_by: 'kid',
        parent_edited: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, ...prev])
      cancel()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PassportPage className="p-6 sm:p-8 min-h-[60vh]">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <p
            className="text-xs font-extrabold uppercase tracking-[0.2em]"
            style={{ color: '#5a3a12' }}
          >
            Journal
          </p>
          <p
            className="text-xs uppercase tracking-widest mt-0.5"
            style={{ color: '#5a3a12', opacity: 0.6 }}
          >
            {childName}&apos;s entries
          </p>
        </div>
      </div>

      {/* COMPOSER — guided / creator only */}
      {canWrite && (
        <section className="mb-6">
          <p
            className="text-sm font-bold mb-3"
            style={{ color: '#3a2810' }}
          >
            What do you want to remember about today?
          </p>

          {permissionMode === 'guided' && activePrompt === null && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GUIDED_PROMPTS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => startPrompt(p.label)}
                  className="text-left bg-white/60 hover:bg-white rounded-xl px-3 py-3 transition-colors inline-flex items-center gap-3"
                  style={{ color: '#3a2810' }}
                >
                  <span className="text-xl leading-none" aria-hidden>{p.emoji}</span>
                  <span className="text-sm font-semibold flex-1">{p.label}</span>
                </button>
              ))}
            </div>
          )}

          {(permissionMode === 'creator' || activePrompt !== null) && (
            <div
              className="bg-white/70 rounded-xl p-4"
              style={{ color: '#3a2810' }}
            >
              {activePrompt && permissionMode === 'guided' && (
                <p className="text-sm font-bold italic mb-2 inline-flex items-center gap-2">
                  {activePrompt}
                  <button
                    type="button"
                    onClick={cancel}
                    className="text-xs opacity-50 hover:opacity-100"
                    aria-label="Pick a different prompt"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </p>
              )}
              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, 4000))}
                rows={permissionMode === 'creator' ? 6 : 4}
                placeholder={
                  permissionMode === 'creator'
                    ? 'Tell us about your day…'
                    : 'Type your answer here…'
                }
                className="w-full bg-transparent border-b-2 border-amber-900/20 focus:border-amber-900/40 outline-none resize-none placeholder:text-amber-900/40 text-sm leading-relaxed"
              />

              <div className="mt-3">
                <p
                  className="text-[10px] uppercase tracking-widest mb-2"
                  style={{ color: '#5a3a12', opacity: 0.6 }}
                >
                  How did today feel?
                </p>
                <div className="flex gap-1.5">
                  {EMOJI_FEELINGS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(emoji === e ? '' : e)}
                      className={`text-2xl w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        emoji === e
                          ? 'bg-white shadow-sm ring-2 ring-amber-700/30'
                          : 'bg-white/40 hover:bg-white'
                      }`}
                      aria-label={`Pick ${e}`}
                      aria-pressed={emoji === e}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-3">{error}</p>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={save}
                  disabled={submitting || (!text.trim() && !emoji)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold bg-amber-900 hover:bg-amber-950 text-amber-50 px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : <><Check className="w-4 h-4" /> Save to my journal</>}
                </button>
                {permissionMode === 'guided' && activePrompt !== null && (
                  <button
                    type="button"
                    onClick={cancel}
                    disabled={submitting}
                    className="text-xs font-medium px-3 py-2"
                    style={{ color: '#5a3a12' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* READ-ONLY message for view-only kids */}
      {!canWrite && (
        <div
          className="bg-white/50 rounded-xl p-4 mb-6 text-sm"
          style={{ color: '#5a3a12' }}
        >
          <p className="font-semibold mb-1">Ask a grown-up</p>
          <p className="text-xs opacity-80">
            Ask whoever you&apos;re travelling with to write something special in your journal. It will appear here.
          </p>
        </div>
      )}

      {/* ENTRIES */}
      <section>
        <p
          className="text-xs font-extrabold uppercase tracking-[0.2em] mb-3 pb-2"
          style={{ color: '#5a3a12', borderBottom: '1px dashed rgba(120,80,30,0.25)' }}
        >
          Past entries ({entries.length})
        </p>

        {entries.length === 0 ? (
          <p
            className="text-center text-xs uppercase tracking-widest py-8"
            style={{ color: '#5a3a12', opacity: 0.7 }}
          >
            No entries yet
          </p>
        ) : (
          <ul className="space-y-4">
            {entries.map(e => <JournalEntryCard key={e.id} entry={e} />)}
          </ul>
        )}
      </section>
    </PassportPage>
  )
}

function JournalEntryCard({ entry }: { entry: JournalEntryRow }) {
  const meta = entry.country_slug ? getPackMeta(entry.country_slug) : null
  // Split prompt from answer if the text was stored as
  // "Prompt label\n\nAnswer" by the guided composer.
  const [maybePrompt, ...rest] = (entry.text ?? '').split('\n\n')
  const body = rest.length > 0 ? rest.join('\n\n') : (entry.text ?? '')
  const prompt = rest.length > 0 ? maybePrompt : null

  return (
    <li
      className="bg-white/50 rounded-xl p-4"
      style={{ color: '#3a2810' }}
    >
      <div className="flex items-baseline gap-2 mb-2 text-xs">
        {meta && (
          <span className="inline-flex items-center gap-1">
            <span className="text-base leading-none">{meta.flag}</span>
            <span className="font-semibold">{meta.country}</span>
          </span>
        )}
        <span className="opacity-50">
          {formatDate(entry.created_at)}
        </span>
        {entry.emoji_rating && <span className="text-base ml-auto">{entry.emoji_rating}</span>}
      </div>
      {prompt && (
        <p className="text-xs font-bold italic mb-1.5 opacity-80">{prompt}</p>
      )}
      {body && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
      )}
      <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-50">
        {entry.created_by === 'parent' ? (
          <span className="inline-flex items-center gap-1"><Pencil className="w-2.5 h-2.5" /> A grown-up wrote this</span>
        ) : entry.parent_edited ? (
          <span className="inline-flex items-center gap-1"><Pencil className="w-2.5 h-2.5" /> Edited by a grown-up</span>
        ) : null}
      </div>
    </li>
  )
}

function formatDate(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
