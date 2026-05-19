'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Pencil, X, Check, ChevronLeft, ChevronRight, MapPin,
} from 'lucide-react'
import PassportPage from '@/components/passport/PassportPage'
import CountryFlag from '@/components/CountryFlag'
import { getPackMeta, PACK_META } from '@/lib/adventurePackData'
import type { PermissionMode } from '@/lib/passport-types'
import type { JournalEntryRow } from '@/lib/passport-journal-db'

const EMOJI_FEELINGS = ['😍', '😊', '😐', '😕', '😴'] as const

const GUIDED_PROMPTS = [
  { emoji: '👀', label: 'Best thing I saw today' },
  { emoji: '😂', label: 'Something funny that happened' },
  { emoji: '🍽️', label: 'Did I try a new food? What was it?' },
  { emoji: '🗣️', label: 'Did I learn a new word? What was it?' },
  { emoji: '🤔', label: 'Most surprising thing today' },
  { emoji: '💛', label: 'Someone I will remember' },
]

type Group = {
  countrySlug: string | null
  countryName: string
  flag: string
  iso2: string | null
  entries: JournalEntryRow[]
}

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

  // Composer state
  const [activePrompt, setActivePrompt] = useState<string | null>(
    permissionMode === 'creator' ? '' : null,
  )
  const [text, setText] = useState('')
  const [emoji, setEmoji] = useState<string>('')
  const [countrySlug, setCountrySlug] = useState<string>('')
  const [place, setPlace] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pagination state for the entry pages
  const groups = useMemo(() => groupByCountry(entries), [entries])
  const [pageIndex, setPageIndex] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [animKey, setAnimKey] = useState(0)
  // Keep pageIndex valid when entries change (e.g. after a new add)
  const safePage = Math.min(pageIndex, Math.max(0, groups.length - 1))

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
      const combined = activePrompt
        ? `${activePrompt}\n\n${text.trim()}`
        : text.trim()
      const res = await fetch(`/api/kid/${token}/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: combined || null,
          emoji_rating: emoji || null,
          country_slug: countrySlug || null,
          place: place.trim() || null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setEntries(prev => [{
        id: body.id ?? `tmp-${Date.now()}`,
        child_id: '',
        country_slug: countrySlug || null,
        place: place.trim() || null,
        text: combined || null,
        emoji_rating: emoji || null,
        created_by: 'kid',
        parent_edited: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, ...prev])
      cancel()
      setCountrySlug('')
      setPlace('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSubmitting(false)
    }
  }

  const turn = (dir: 'next' | 'prev') => {
    const hasPrev = safePage > 0
    const hasNext = safePage < groups.length - 1
    if (dir === 'next' && !hasNext) return
    if (dir === 'prev' && !hasPrev) return
    setDirection(dir)
    setPageIndex(safePage + (dir === 'next' ? 1 : -1))
    setAnimKey(k => k + 1)
  }

  const current = groups[safePage]

  const footerEl = groups.length > 1 ? (
    <div
      className="flex items-center justify-between gap-3 text-sm px-2"
      style={{ color: '#5a3a12' }}
    >
      <button
        type="button"
        onClick={() => turn('prev')}
        disabled={safePage <= 0}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="uppercase tracking-widest text-xs">
          {safePage > 0 ? groups[safePage - 1].countryName : 'Prev'}
        </span>
      </button>
      <div className="flex items-center gap-1">
        {groups.map((g, i) => (
          <button
            key={g.countrySlug ?? '__none__'}
            type="button"
            onClick={() => {
              if (i === safePage) return
              setDirection(i > safePage ? 'next' : 'prev')
              setPageIndex(i)
              setAnimKey(k => k + 1)
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              i === safePage ? 'bg-amber-800 w-4' : 'bg-amber-800/30 hover:bg-amber-800/50'
            }`}
            aria-label={`Go to ${g.countryName} page`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => turn('next')}
        disabled={safePage >= groups.length - 1}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <span className="uppercase tracking-widest text-xs">
          {safePage < groups.length - 1 ? groups[safePage + 1].countryName : 'Next'}
        </span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  ) : null

  return (
    <PassportPage className="p-6 sm:p-8" book footer={footerEl}>
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
        {groups.length > 1 && (
          <p className="text-xs uppercase tracking-widest" style={{ color: '#5a3a12', opacity: 0.6 }}>
            Page {safePage + 1} of {groups.length}
          </p>
        )}
      </div>

      {/* COMPOSER */}
      {canWrite ? (
        <section className="mb-6">
          <p
            className="text-sm font-bold mb-3"
            style={{ color: '#3a2810' }}
          >
            What do you want to remember about today?
          </p>

          {permissionMode === 'guided' && activePrompt === null ? (
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
          ) : (
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
                rows={permissionMode === 'creator' ? 10 : 7}
                placeholder={
                  permissionMode === 'creator'
                    ? 'Tell us about your day…'
                    : 'Type your answer here…'
                }
                className="w-full bg-transparent border-b-2 border-amber-900/20 focus:border-amber-900/40 outline-none resize-none placeholder:text-amber-900/40 text-base leading-relaxed"
              />

              {/* Where? — country + place */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={countrySlug}
                  onChange={e => setCountrySlug(e.target.value)}
                  className="px-3 py-2 bg-white/60 border border-amber-900/15 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  style={{ color: '#3a2810' }}
                  aria-label="Country"
                >
                  <option value="">No country (general)</option>
                  {PACK_META.map(p => (
                    <option key={p.slug} value={p.slug}>{p.flag} {p.country}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={place}
                  onChange={e => setPlace(e.target.value.slice(0, 100))}
                  placeholder="Place (e.g. Tokyo, Eiffel Tower)"
                  className="px-3 py-2 bg-white/60 border border-amber-900/15 rounded-md text-xs placeholder:text-amber-900/40 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
                  style={{ color: '#3a2810' }}
                  aria-label="Place"
                />
              </div>

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
      ) : (
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

      {/* PAGINATED ENTRY PAGES */}
      <section
        className="pt-5"
        style={{ borderTop: '1px dashed rgba(120,80,30,0.25)' }}
      >
        {entries.length === 0 ? (
          <p
            className="text-center text-xs uppercase tracking-widest py-8"
            style={{ color: '#5a3a12', opacity: 0.7 }}
          >
            No entries yet
          </p>
        ) : (
          <>
            <div
              key={animKey}
              className={direction === 'next' ? 'animate-page-turn-next' : 'animate-page-turn-prev'}
            >
              {current && <CountryJournalPage group={current} />}
            </div>

          </>
        )}
      </section>
    </PassportPage>
  )
}

function CountryJournalPage({ group }: { group: Group }) {
  return (
    <section>
      <div
        className="flex items-baseline justify-between gap-3 mb-4 pb-2"
        style={{ borderBottom: '1px dashed rgba(120,80,30,0.25)', color: '#5a3a12' }}
      >
        <div className="inline-flex items-center gap-2">
          {group.iso2
            ? <CountryFlag iso2={group.iso2} country={group.countryName} ariaHidden size="lg" />
            : <span className="text-2xl leading-none" aria-hidden>{group.flag}</span>}
          <h3 className="text-base font-extrabold uppercase tracking-[0.18em]">{group.countryName}</h3>
        </div>
        <p className="text-xs uppercase tracking-widest opacity-60">
          {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
        </p>
      </div>
      <ul className="space-y-3">
        {group.entries.map(e => <JournalEntryCard key={e.id} entry={e} />)}
      </ul>
    </section>
  )
}

function JournalEntryCard({ entry }: { entry: JournalEntryRow }) {
  const [maybePrompt, ...rest] = (entry.text ?? '').split('\n\n')
  const body = rest.length > 0 ? rest.join('\n\n') : (entry.text ?? '')
  const prompt = rest.length > 0 ? maybePrompt : null

  return (
    <li
      className="bg-white/50 rounded-xl p-4"
      style={{ color: '#3a2810' }}
    >
      <div className="flex items-baseline gap-2 mb-2 text-xs flex-wrap">
        {entry.place && (
          <span className="inline-flex items-center gap-1 font-semibold">
            <MapPin className="w-3 h-3 opacity-60" /> {entry.place}
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

function groupByCountry(entries: JournalEntryRow[]): Group[] {
  const byCountry = new Map<string, Group>()
  for (const e of entries) {
    const key = e.country_slug ?? '__none__'
    const meta = e.country_slug ? getPackMeta(e.country_slug) : null
    if (!byCountry.has(key)) {
      byCountry.set(key, {
        countrySlug: e.country_slug ?? null,
        countryName: meta?.country ?? 'Other entries',
        flag: meta?.flag ?? '📓',
        iso2: meta?.iso2 ?? null,
        entries: [],
      })
    }
    byCountry.get(key)!.entries.push(e)
  }
  const groups = Array.from(byCountry.values())
  for (const g of groups) {
    g.entries.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }
  groups.sort((a, b) => {
    const aLatest = a.entries[0]?.created_at ?? ''
    const bLatest = b.entries[0]?.created_at ?? ''
    return aLatest < bLatest ? 1 : -1
  })
  return groups
}

function formatDate(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
