'use client'

// Parent's journal control panel for one child:
//  - List of every journal entry (kid + parent), newest first
//  - Edit any entry inline (kid-written entries get a parent_edited
//    flag the kid view shows)
//  - Delete any entry
//  - Add a parent-written entry (great for view-only mode, or for
//    backdating memories from before the family started using JFT)

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen, Plus, Loader2, Pencil, Trash2, X, Check,
} from 'lucide-react'
import type { JournalEntryRow } from '@/lib/passport-journal-db'

type PackMetaLite = { slug: string; country: string; flag: string }

const EMOJI_FEELINGS = ['😍', '😊', '😐', '😕', '😴']

export default function JournalSection({
  childId,
  initialEntries,
  allPacks,
}: {
  childId: string
  initialEntries: JournalEntryRow[]
  allPacks: PackMetaLite[]
}) {
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntryRow[]>(initialEntries)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Add form
  const [adding, setAdding] = useState(false)
  const [addText, setAddText] = useState('')
  const [addEmoji, setAddEmoji] = useState('')
  const [addCountry, setAddCountry] = useState('')
  const [addPlace, setAddPlace] = useState('')
  const [addDate, setAddDate] = useState(today())
  const [addSubmitting, setAddSubmitting] = useState(false)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addText.trim() && !addEmoji) {
      setError('Write something or pick an emoji first.')
      return
    }
    setAddSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: addText.trim() || null,
          emoji_rating: addEmoji || null,
          country_slug: addCountry || null,
          place: addPlace.trim() || null,
          created_at: addDate,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setEntries(prev => [{
        id: body.id ?? `tmp-${Date.now()}`,
        child_id: childId,
        country_slug: addCountry || null,
        place: addPlace.trim() || null,
        text: addText.trim() || null,
        emoji_rating: addEmoji || null,
        created_by: 'parent',
        parent_edited: false,
        created_at: new Date(addDate + 'T12:00:00Z').toISOString(),
        updated_at: new Date().toISOString(),
      }, ...prev])
      setAddText('')
      setAddEmoji('')
      setAddCountry('')
      setAddPlace('')
      setAddDate(today())
      setAdding(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add entry')
    } finally {
      setAddSubmitting(false)
    }
  }

  const remove = async (entryId: string) => {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    setBusy(entryId)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/journal/${entryId}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setEntries(prev => prev.filter(e => e.id !== entryId))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-brand-600" />
        <h2 className="text-lg font-bold text-gray-900">Journal</h2>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        Every entry written by the child or by you. You can edit kid entries (we flag this transparently for them) or add your own. Useful in view-only mode, or to backdate memories.
      </p>

      {/* Add form */}
      {adding ? (
        <form onSubmit={add} className="bg-sand-50 rounded-xl p-4 mb-5 space-y-3">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600">New entry</p>
          <textarea
            value={addText}
            onChange={e => setAddText(e.target.value.slice(0, 5000))}
            rows={4}
            placeholder="What do you want to remember?"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 mr-1">Feeling:</span>
            {EMOJI_FEELINGS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setAddEmoji(addEmoji === e ? '' : e)}
                className={`text-xl w-8 h-8 rounded-full ${
                  addEmoji === e ? 'bg-brand-50 ring-2 ring-brand-300' : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
                aria-pressed={addEmoji === e}
              >{e}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={addCountry}
              onChange={e => setAddCountry(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="">No country</option>
              {allPacks.map(p => (
                <option key={p.slug} value={p.slug}>{p.flag} {p.country}</option>
              ))}
            </select>
            <input
              type="text"
              value={addPlace}
              onChange={e => setAddPlace(e.target.value.slice(0, 100))}
              placeholder="Place (e.g. Tokyo)"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <input
              type="date"
              value={addDate}
              max={today()}
              onChange={e => setAddDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={addSubmitting || (!addText.trim() && !addEmoji)}
              className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-60"
            >
              {addSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Save</>}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setAddText(''); setAddEmoji(''); setAddCountry(''); setAddDate(today()) }}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full mb-5 inline-flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-brand-300 rounded-xl py-3 text-sm font-medium text-gray-500 hover:text-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add an entry
        </button>
      )}

      {/* Entry list */}
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No entries yet.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map(entry => (
            <EntryRow
              key={entry.id}
              childId={childId}
              entry={entry}
              allPacks={allPacks}
              isEditing={editingId === entry.id}
              isBusy={busy === entry.id}
              onEdit={() => setEditingId(entry.id)}
              onCancelEdit={() => setEditingId(null)}
              onRemove={() => remove(entry.id)}
              onSaved={updated => {
                setEntries(prev => prev.map(e => e.id === entry.id ? updated : e))
                setEditingId(null)
                router.refresh()
              }}
            />
          ))}
        </ul>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-4">{error}</p>
      )}
    </section>
  )
}

function EntryRow({
  childId,
  entry,
  allPacks,
  isEditing,
  isBusy,
  onEdit,
  onCancelEdit,
  onRemove,
  onSaved,
}: {
  childId: string
  entry: JournalEntryRow
  allPacks: PackMetaLite[]
  isEditing: boolean
  isBusy: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onRemove: () => void
  onSaved: (updated: JournalEntryRow) => void
}) {
  const [text, setText] = useState(entry.text ?? '')
  const [emoji, setEmoji] = useState(entry.emoji_rating ?? '')
  const [country, setCountry] = useState(entry.country_slug ?? '')
  const [place, setPlace] = useState(entry.place ?? '')
  const [date, setDate] = useState(toDateInput(entry.created_at))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const meta = entry.country_slug ? allPacks.find(p => p.slug === entry.country_slug) : null

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/family/children/${childId}/journal/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim() || null,
          emoji_rating: emoji || null,
          country_slug: country || null,
          place: place.trim() || null,
          created_at: date,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      onSaved({
        ...entry,
        text: text.trim() || null,
        emoji_rating: emoji || null,
        country_slug: country || null,
        place: place.trim() || null,
        created_at: new Date(date + 'T12:00:00Z').toISOString(),
        parent_edited: entry.created_by === 'kid' ? true : entry.parent_edited,
        updated_at: new Date().toISOString(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (isEditing) {
    return (
      <li className="bg-sand-50 rounded-xl p-4 space-y-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, 5000))}
          rows={4}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 mr-1">Feeling:</span>
          {EMOJI_FEELINGS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(emoji === e ? '' : e)}
              className={`text-xl w-8 h-8 rounded-full ${
                emoji === e ? 'bg-brand-50 ring-2 ring-brand-300' : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >{e}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="">No country</option>
            {allPacks.map(p => (
              <option key={p.slug} value={p.slug}>{p.flag} {p.country}</option>
            ))}
          </select>
          <input
            type="text"
            value={place}
            onChange={e => setPlace(e.target.value.slice(0, 100))}
            placeholder="Place (e.g. Tokyo)"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <input
            type="date"
            value={date}
            max={today()}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-60"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={saving}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2"
          >
            Cancel
          </button>
        </div>
      </li>
    )
  }

  const [maybePrompt, ...rest] = (entry.text ?? '').split('\n\n')
  const body = rest.length > 0 ? rest.join('\n\n') : (entry.text ?? '')
  const prompt = rest.length > 0 ? maybePrompt : null

  return (
    <li className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-baseline gap-2 mb-2 text-xs flex-wrap">
        {meta && (
          <span className="inline-flex items-center gap-1 text-gray-700">
            <span className="text-base leading-none">{meta.flag}</span>
            <span className="font-semibold">{meta.country}</span>
          </span>
        )}
        {entry.place && (
          <span className="text-gray-600 font-medium">· {entry.place}</span>
        )}
        <span className="text-gray-500">· {formatDate(entry.created_at)}</span>
        <span className="text-gray-400 ml-auto inline-flex items-center gap-2">
          {entry.emoji_rating && <span className="text-base">{entry.emoji_rating}</span>}
          <span className="text-[10px] uppercase tracking-widest">
            {entry.created_by === 'parent' ? 'You wrote this' : entry.parent_edited ? 'You edited this' : 'Kid'}
          </span>
        </span>
      </div>
      {prompt && (
        <p className="text-xs font-bold italic mb-1 text-gray-700">{prompt}</p>
      )}
      {body && <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">{body}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          disabled={isBusy}
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-brand-700 border border-gray-200 px-2.5 py-1.5 rounded-md disabled:opacity-50"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={isBusy}
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-red-600 border border-gray-200 px-2.5 py-1.5 rounded-md disabled:opacity-50"
        >
          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
        </button>
      </div>
    </li>
  )
}

function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Convert any ISO timestamp string into YYYY-MM-DD for an <input type="date">
function toDateInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return today()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDate(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
