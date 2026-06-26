'use client'

import { useState, useMemo } from 'react'
import { Plus, Download, Pencil, Trash2, X, ChevronUp, ChevronDown, ExternalLink, Video } from 'lucide-react'
import { createReel, updateReel, deleteReel } from './actions'
import { COUNTRIES } from '@/lib/countries'
import { COUNTRY_TZ, localToGmt } from './timezones'

export type Reel = {
  id: string
  name: string
  post_type: 'trial' | 'main'
  posted_date: string | null
  posted_country: string | null
  posted_time_local: string | null
  posted_time_gmt: string | null
  instagram_url: string | null
  duration_seconds: number | null
  clip_count: number | null
  audio_type: string | null
  topic: string | null
  content_scope: string | null
  content_country: string | null
  visual_hook: string | null
  verbal_hook: string | null
  text_hook: string | null
  hook_duration_seconds: number | null
  views: number | null
  reach: number | null
  plays: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  follows_gained: number | null
  avg_watch_time_seconds: number | null
  watch_through_rate_pct: number | null
  profile_visits: number | null
  non_follower_views: number | null
  non_follower_watch_pct: number | null
  notes: string | null
  created_at: string
}

const EMPTY_FORM: Record<string, string> = {
  name: '', post_type: 'main', posted_date: '', posted_country: '',
  posted_time_local: '', instagram_url: '',
  duration_seconds: '', clip_count: '', audio_type: '', topic: '',
  content_scope: 'general', content_country: '',
  visual_hook: '', verbal_hook: '', text_hook: '', hook_duration_seconds: '',
  views: '', reach: '', plays: '', likes: '', comments: '', shares: '',
  saves: '', follows_gained: '', avg_watch_time_seconds: '',
  watch_through_rate_pct: '', profile_visits: '',
  non_follower_views: '', non_follower_watch_pct: '', notes: '',
}

function reelToForm(r: Reel): Record<string, string> {
  return {
    name:                     r.name,
    post_type:                r.post_type,
    posted_date:              r.posted_date ?? '',
    posted_country:           r.posted_country ?? '',
    posted_time_local:        r.posted_time_local ?? '',
    instagram_url:            r.instagram_url ?? '',
    duration_seconds:         r.duration_seconds?.toString() ?? '',
    clip_count:               r.clip_count?.toString() ?? '',
    audio_type:               r.audio_type ?? '',
    topic:                    r.topic ?? '',
    content_scope:            r.content_scope ?? 'general',
    content_country:          r.content_country ?? '',
    visual_hook:              r.visual_hook ?? '',
    verbal_hook:              r.verbal_hook ?? '',
    text_hook:                r.text_hook ?? '',
    hook_duration_seconds:    r.hook_duration_seconds?.toString() ?? '',
    views:                    r.views?.toString() ?? '',
    reach:                    r.reach?.toString() ?? '',
    plays:                    r.plays?.toString() ?? '',
    likes:                    r.likes?.toString() ?? '',
    comments:                 r.comments?.toString() ?? '',
    shares:                   r.shares?.toString() ?? '',
    saves:                    r.saves?.toString() ?? '',
    follows_gained:           r.follows_gained?.toString() ?? '',
    avg_watch_time_seconds:   r.avg_watch_time_seconds?.toString() ?? '',
    watch_through_rate_pct:   r.watch_through_rate_pct?.toString() ?? '',
    profile_visits:           r.profile_visits?.toString() ?? '',
    non_follower_views:       r.non_follower_views?.toString() ?? '',
    non_follower_watch_pct:   r.non_follower_watch_pct?.toString() ?? '',
    notes:                    r.notes ?? '',
  }
}

function fmtN(n: number | null, decimals = 0): string {
  if (n === null) return '—'
  return decimals > 0
    ? n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : n.toLocaleString()
}

function fmtDur(s: number | null): string {
  if (s === null) return '—'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

type SortKey = keyof Reel
type Modal =
  | null
  | 'add'
  | { type: 'edit'; reel: Reel }
  | { type: 'delete'; reel: Reel }

const AUDIO_OPTIONS = [
  { value: '',            label: 'Not set' },
  { value: 'voiceover',  label: 'Voiceover' },
  { value: 'audio_only', label: 'Audio only (no voiceover)' },
]

const TABLE_COLS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'name',                   label: 'Name' },
  { key: 'post_type',              label: 'Type' },
  { key: 'posted_date',            label: 'Date / GMT' },
  { key: 'content_country',        label: 'About' },
  { key: 'duration_seconds',       label: 'Duration',  numeric: true },
  { key: 'clip_count',             label: 'Clips',     numeric: true },
  { key: 'views',                  label: 'Views',     numeric: true },
  { key: 'reach',                  label: 'Reach',     numeric: true },
  { key: 'watch_through_rate_pct', label: 'Watch%',    numeric: true },
  { key: 'follows_gained',         label: 'Follows',   numeric: true },
  { key: 'likes',                  label: 'Likes',     numeric: true },
  { key: 'saves',                  label: 'Saves',     numeric: true },
  { key: 'shares',                 label: 'Shares',    numeric: true },
]

const CSV_COLS: [keyof Reel, string][] = [
  ['name',                   'name'],
  ['post_type',              'type'],
  ['posted_date',            'date'],
  ['posted_country',         'posted_in'],
  ['posted_time_local',      'time_local'],
  ['posted_time_gmt',        'time_gmt'],
  ['content_scope',          'scope'],
  ['content_country',        'about_country'],
  ['duration_seconds',       'dur_s'],
  ['clip_count',             'clips'],
  ['audio_type',             'audio'],
  ['topic',                  'topic'],
  ['visual_hook',            'vis_hook'],
  ['verbal_hook',            'verb_hook'],
  ['text_hook',              'txt_hook'],
  ['hook_duration_seconds',  'hook_s'],
  ['views',                  'views'],
  ['reach',                  'reach'],
  ['plays',                  'plays'],
  ['likes',                  'likes'],
  ['comments',               'comments'],
  ['shares',                 'shares'],
  ['saves',                  'saves'],
  ['follows_gained',         'follows'],
  ['avg_watch_time_seconds', 'avg_watch_s'],
  ['watch_through_rate_pct', 'watch_pct'],
  ['profile_visits',         'profile_visits'],
  ['non_follower_views',     'nf_views'],
  ['non_follower_watch_pct', 'nf_watch_pct'],
  ['instagram_url',          'ig_url'],
  ['notes',                  'notes'],
]

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const str = String(v)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function exportToCsv(reels: Reel[]) {
  const header = CSV_COLS.map(([, short]) => short).join(',')
  const rows = reels.map(r =>
    CSV_COLS.map(([key]) => csvEscape(r[key])).join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `jft-reels-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const INPUT = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const LABEL = 'block text-xs font-semibold text-gray-600 mb-1'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}{hint && <span className="font-normal text-gray-400 ml-1">({hint})</span>}</label>
      {children}
    </div>
  )
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="border-b border-gray-100 pb-2 mb-4">
      <h3 className="text-xs font-bold tracking-widest uppercase text-brand-600">{title}</h3>
    </div>
  )
}

export default function ReelsClient({ initialReels }: { initialReels: Reel[] }) {
  const [reels, setReels]     = useState<Reel[]>(initialReels)
  const [modal, setModal]     = useState<Modal>(null)
  const [form, setForm]       = useState<Record<string, string>>(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('posted_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    return [...reels].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [reels, sortKey, sortDir])

  // Compute GMT time reactively from date + local time + country
  const computedGmt = useMemo(() => {
    const tz = COUNTRY_TZ[form.posted_country?.toLowerCase()]
    if (!tz) return null
    return localToGmt(form.posted_date, form.posted_time_local, tz)
  }, [form.posted_date, form.posted_time_local, form.posted_country])

  function openAdd()         { setForm(EMPTY_FORM); setError(null); setModal('add') }
  function openEdit(r: Reel) { setForm(reelToForm(r)); setError(null); setModal({ type: 'edit', reel: r }) }
  function openDelete(r: Reel, e: React.MouseEvent) { e.stopPropagation(); setError(null); setModal({ type: 'delete', reel: r }) }
  function closeModal()      { setModal(null); setSaving(false); setError(null) }

  function f(key: string)  { return form[key] ?? '' }
  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError(null)
    const formWithGmt = { ...form, posted_time_gmt: computedGmt ?? '' }
    try {
      if (modal === 'add') {
        const created = await createReel(formWithGmt)
        setReels(prev => [created as Reel, ...prev])
      } else if (modal !== null && typeof modal === 'object' && modal.type === 'edit') {
        const updated = await updateReel(modal.reel.id, formWithGmt)
        setReels(prev => prev.map(r => r.id === (modal as { type: 'edit'; reel: Reel }).reel.id ? updated as Reel : r))
      }
      closeModal()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (modal === null || typeof modal !== 'object' || modal.type !== 'delete') return
    const target = modal as { type: 'delete'; reel: Reel }
    setSaving(true)
    try {
      await deleteReel(target.reel.id)
      setReels(prev => prev.filter(r => r.id !== target.reel.id))
      closeModal()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setSaving(false)
    }
  }

  const isTrial            = f('post_type') === 'trial'
  const isCountrySpecific  = f('content_scope') === 'country_specific'
  const isAdd              = modal === 'add'
  const isEdit             = typeof modal === 'object' && modal?.type === 'edit'
  const isDelete           = typeof modal === 'object' && modal?.type === 'delete'
  const showForm           = isAdd || isEdit

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <p className="text-sm text-gray-500">
          {reels.length === 0 ? 'No reels logged yet.' : `${reels.length} reel${reels.length === 1 ? '' : 's'}`}
        </p>
        <div className="flex items-center gap-3">
          {reels.length > 0 && (
            <button
              onClick={() => exportToCsv(sorted)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand-300 hover:text-brand-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Reel
          </button>
        </div>
      </div>

      {/* Empty state */}
      {reels.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center">
          <Video className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700 mb-1">No reels yet</p>
          <p className="text-sm text-gray-400 mb-6">Log your first reel to start building your analytics.</p>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
            <Plus className="w-4 h-4" /> Add your first reel
          </button>
        </div>
      )}

      {/* Table */}
      {reels.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {TABLE_COLS.map(col => {
                  const active = sortKey === col.key
                  return (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className={`cursor-pointer whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide select-none ${
                        active ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
                      } ${col.numeric ? 'text-right' : ''}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {active
                          ? sortDir === 'asc'
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3 opacity-20" />}
                      </span>
                    </th>
                  )
                })}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(r => (
                <tr
                  key={r.id}
                  onClick={() => openEdit(r)}
                  className="cursor-pointer hover:bg-sand-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[12rem] truncate">{r.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      r.post_type === 'trial'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-brand-100 text-brand-700'
                    }`}>
                      {r.post_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-gray-700">{fmtDate(r.posted_date)}</span>
                    {r.posted_time_gmt && (
                      <span className="block text-xs text-gray-400">{r.posted_time_gmt} UTC</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[8rem] truncate text-xs">
                    {r.content_scope === 'country_specific' && r.content_country
                      ? r.content_country
                      : r.content_scope === 'general'
                        ? <span className="text-gray-300">General</span>
                        : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtDur(r.duration_seconds)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtN(r.clip_count)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{fmtN(r.views)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtN(r.reach)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {r.watch_through_rate_pct !== null ? `${fmtN(r.watch_through_rate_pct, 1)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtN(r.follows_gained)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtN(r.likes)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtN(r.saves)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtN(r.shares)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end" onClick={e => e.stopPropagation()}>
                      {r.instagram_url && (
                        <a href={r.instagram_url} target="_blank" rel="noopener noreferrer" title="Open on Instagram" className="text-gray-300 hover:text-brand-600 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button onClick={e => { e.stopPropagation(); openEdit(r) }} title="Edit" className="text-gray-300 hover:text-brand-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => openDelete(r, e)} title="Delete" className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{isAdd ? 'Add reel' : 'Edit reel'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-6 py-5 space-y-7">

              {/* Details */}
              <div>
                <SectionHead title="Details" />
                <div className="space-y-4">
                  <Field label="Reel name *">
                    <input type="text" value={f('name')} onChange={set('name')} placeholder="e.g. Singapore temples family day" className={INPUT} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Post type">
                      <select value={f('post_type')} onChange={set('post_type')} className={INPUT}>
                        <option value="main">Main post</option>
                        <option value="trial">Trial reel</option>
                      </select>
                    </Field>
                    <Field label="Posted date">
                      <input type="date" value={f('posted_date')} onChange={set('posted_date')} className={INPUT} />
                    </Field>
                  </div>

                  {/* Country + time */}
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Country you were in">
                      <select value={f('posted_country')} onChange={set('posted_country')} className={INPUT}>
                        <option value="">Select country…</option>
                        {COUNTRIES.map(c => (
                          <option key={c.iso2} value={c.iso2}>{c.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Local time posted" hint="HH:MM">
                      <div className="space-y-1">
                        <input
                          type="time"
                          value={f('posted_time_local')}
                          onChange={set('posted_time_local')}
                          className={INPUT}
                        />
                        {computedGmt ? (
                          <p className="text-xs text-brand-700 font-medium pl-1">= {computedGmt} UTC</p>
                        ) : f('posted_time_local') && !COUNTRY_TZ[f('posted_country')?.toLowerCase()] && f('posted_country') ? (
                          <p className="text-xs text-amber-600 pl-1">No timezone for selected country</p>
                        ) : null}
                      </div>
                    </Field>
                  </div>

                  <Field label="Instagram URL">
                    <input type="url" value={f('instagram_url')} onChange={set('instagram_url')} placeholder="https://www.instagram.com/reel/…" className={INPUT} />
                  </Field>
                </div>
              </div>

              {/* Content */}
              <div>
                <SectionHead title="Content" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Duration (seconds)">
                    <input type="number" min="0" value={f('duration_seconds')} onChange={set('duration_seconds')} placeholder="e.g. 32" className={INPUT} />
                  </Field>
                  <Field label="Number of clips">
                    <input type="number" min="0" value={f('clip_count')} onChange={set('clip_count')} placeholder="e.g. 8" className={INPUT} />
                  </Field>
                  <Field label="Audio type">
                    <select value={f('audio_type')} onChange={set('audio_type')} className={INPUT}>
                      {AUDIO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Topic / niche">
                    <input type="text" value={f('topic')} onChange={set('topic')} placeholder="e.g. budget travel, Asia, street food" className={INPUT} />
                  </Field>
                </div>

                {/* Content scope */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Field label="Content scope">
                    <select value={f('content_scope')} onChange={set('content_scope')} className={INPUT}>
                      <option value="general">General travel</option>
                      <option value="country_specific">Country-specific</option>
                    </select>
                  </Field>
                  {isCountrySpecific && (
                    <Field label="Which country is it about?">
                      <input
                        type="text"
                        value={f('content_country')}
                        onChange={set('content_country')}
                        placeholder="e.g. Singapore"
                        className={INPUT}
                        list="content-country-list"
                      />
                      <datalist id="content-country-list">
                        {COUNTRIES.map(c => <option key={c.iso2} value={c.name} />)}
                      </datalist>
                    </Field>
                  )}
                </div>
              </div>

              {/* Hooks */}
              <div>
                <SectionHead title="Hooks" />
                <div className="space-y-4">
                  <Field label="Visual hook" hint="what viewers SEE in the first 1-3 seconds">
                    <textarea rows={2} value={f('visual_hook')} onChange={set('visual_hook')} placeholder="e.g. Close-up of kids faces reacting to street food, then pull back to reveal the market" className={INPUT} />
                  </Field>
                  <Field label="Verbal hook" hint="what is SAID, voiceover or on-camera">
                    <textarea rows={2} value={f('verbal_hook')} onChange={set('verbal_hook')} placeholder='e.g. "We spent a day exploring Singapore on £30 as a family of four..."' className={INPUT} />
                  </Field>
                  <Field label="Text hook" hint="on-screen text overlay">
                    <textarea rows={2} value={f('text_hook')} onChange={set('text_hook')} placeholder='e.g. "Singapore on a budget with kids" or a question on screen' className={INPUT} />
                  </Field>
                  <Field label="Hook duration (seconds)">
                    <input type="number" min="0" max="30" value={f('hook_duration_seconds')} onChange={set('hook_duration_seconds')} placeholder="e.g. 3" className={`${INPUT} max-w-[8rem]`} />
                  </Field>
                </div>
              </div>

              {/* Performance */}
              <div>
                <SectionHead title="Performance metrics" />
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'views',          label: 'Views' },
                    { key: 'reach',          label: 'Reach' },
                    { key: 'plays',          label: 'Plays (incl. replays)' },
                    { key: 'likes',          label: 'Likes' },
                    { key: 'comments',       label: 'Comments' },
                    { key: 'shares',         label: 'Shares' },
                    { key: 'saves',          label: 'Saves' },
                    { key: 'follows_gained', label: 'Follows gained' },
                    { key: 'profile_visits', label: 'Profile visits' },
                  ].map(({ key, label }) => (
                    <Field key={key} label={label}>
                      <input type="number" min="0" value={f(key)} onChange={set(key)} placeholder="—" className={INPUT} />
                    </Field>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="Average watch time (seconds)">
                    <input type="number" min="0" step="0.1" value={f('avg_watch_time_seconds')} onChange={set('avg_watch_time_seconds')} placeholder="e.g. 12.4" className={INPUT} />
                  </Field>
                  <Field label="Watch-through rate (%)">
                    <input type="number" min="0" max="100" step="0.1" value={f('watch_through_rate_pct')} onChange={set('watch_through_rate_pct')} placeholder="e.g. 38.5" className={INPUT} />
                  </Field>
                </div>
              </div>

              {/* Trial-only */}
              {isTrial && (
                <div>
                  <SectionHead title="Trial reel metrics" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Non-follower views">
                      <input type="number" min="0" value={f('non_follower_views')} onChange={set('non_follower_views')} placeholder="—" className={INPUT} />
                    </Field>
                    <Field label="Non-follower watch-through (%)">
                      <input type="number" min="0" max="100" step="0.1" value={f('non_follower_watch_pct')} onChange={set('non_follower_watch_pct')} placeholder="—" className={INPUT} />
                    </Field>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <SectionHead title="Notes" />
                <textarea rows={3} value={f('notes')} onChange={set('notes')} placeholder="Anything else worth remembering about this reel…" className={INPUT} />
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              {error
                ? <p className="text-sm text-red-600">{error}</p>
                : <span />}
              <div className="flex gap-3">
                <button onClick={closeModal} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save reel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {isDelete && typeof modal === 'object' && modal.type === 'delete' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete reel?</h2>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete <strong>{modal.reel.name}</strong> and all its metrics. This cannot be undone.
            </p>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={closeModal} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
