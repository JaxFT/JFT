'use client'

// JFT Prompt Builder — client island.
//
// Browse categories → open a prompt → answer its guided questions →
// copy the engineered prompt for your own AI. The "family profile"
// (adults, kids' ages, home country/airport/currency, travel style) is
// captured once and reused across every prompt; it lives in
// localStorage for everyone and also syncs to Supabase for signed-in
// users. Home airport pre-fills the flight "Flying from?" fields and
// home currency is injected into money prompts.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, Copy, Check, Globe, Bot, ChevronDown, Users, Wand2, Lock, Plus, X, BookOpen,
} from 'lucide-react'
import { COUNTRIES } from '@/lib/countries'
import {
  CATEGORIES, PROMPTS, BADGE_LABEL, BADGE_NOTE, EMPTY_PROFILE, TRAVEL_STYLES,
  CURRENCIES, MAJOR_AIRPORTS, relatedFor,
  type CategoryId, type FamilyProfile, type PromptDef, type Question, type RelatedContentItem,
} from '@/lib/jft-prompts'

const LS_KEY = 'jft-family-profile'

// Full country list (minus Antarctica) for the home-country picker.
const COUNTRY_NAMES = COUNTRIES
  .filter(c => c.continent !== 'Antarctica')
  .map(c => c.name)
  .sort((a, b) => a.localeCompare(b))

type Props = {
  isLoggedIn: boolean
  initialProfile: FamilyProfile
  related: RelatedContentItem[]
}

function isEmptyProfile(p: FamilyProfile): boolean {
  return !p.adults && p.kidsAges.length === 0 && !p.homeCountry
    && !p.homeAirport && !p.homeCurrency && p.travelStyle.length === 0
}

export default function PromptBuilder({ isLoggedIn, initialProfile, related }: Props) {
  const [profile, setProfile] = useState<FamilyProfile>(initialProfile)
  const [kids, setKids] = useState<string[]>(
    initialProfile.kidsAges.length ? initialProfile.kidsAges.map(String) : [''],
  )
  const [profileSaved, setProfileSaved] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  const [activeCat, setActiveCat] = useState<CategoryId>('route')
  const [openId, setOpenId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // First mount: if the server gave us nothing, hydrate from localStorage.
  useEffect(() => {
    if (!isEmptyProfile(initialProfile)) return
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const p = JSON.parse(raw) as FamilyProfile
      const merged: FamilyProfile = {
        ...EMPTY_PROFILE,
        ...p,
        kidsAges: Array.isArray(p.kidsAges) ? p.kidsAges : [],
        travelStyle: Array.isArray(p.travelStyle) ? p.travelStyle : [],
      }
      setProfile(merged)
      setKids(merged.kidsAges.length ? merged.kidsAges.map(String) : [''])
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const parseKids = (list: string[]): number[] =>
    list
      .map(s => parseInt(s, 10))
      .filter(n => Number.isFinite(n) && n >= 0 && n <= 17)
      .slice(0, 10)

  const liveProfile = (): FamilyProfile => ({ ...profile, kidsAges: parseKids(kids) })

  const updateProfile = (patch: Partial<FamilyProfile>) => {
    setProfile(prev => ({ ...prev, ...patch }))
    setProfileSaved(false)
  }

  const addKid = () => { setKids(k => [...k, '']); setProfileSaved(false) }
  const removeKid = (i: number) => { setKids(k => k.filter((_, idx) => idx !== i)); setProfileSaved(false) }
  const updateKid = (i: number, v: string) => { setKids(k => k.map((x, idx) => idx === i ? v : x)); setProfileSaved(false) }

  const toggleStyle = (s: string) => {
    setProfile(prev => ({
      ...prev,
      travelStyle: prev.travelStyle.includes(s)
        ? prev.travelStyle.filter(x => x !== s)
        : [...prev.travelStyle, s],
    }))
    setProfileSaved(false)
  }

  const saveProfile = async () => {
    const toSave = liveProfile()
    setProfile(toSave)
    setKids(toSave.kidsAges.length ? toSave.kidsAges.map(String) : [''])
    setSavingProfile(true)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(toSave))
      if (isLoggedIn) {
        await fetch('/api/family-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adults: toSave.adults,
            kids_ages: toSave.kidsAges,
            home_country: toSave.homeCountry,
            home_airport: toSave.homeAirport,
            home_currency: toSave.homeCurrency,
            travel_style: toSave.travelStyle,
          }),
        })
      }
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch {
      /* localStorage at least succeeded in most cases */
    } finally {
      setSavingProfile(false)
    }
  }

  const setAnswer = (pid: string, qid: string, val: string) =>
    setAnswers(prev => ({ ...prev, [pid]: { ...prev[pid], [qid]: val } }))

  const clearPrompt = (pid: string) =>
    setAnswers(prev => { const n = { ...prev }; delete n[pid]; return n })

  // Toggle one value in a comma-joined multiselect answer.
  const toggleMulti = (pid: string, qid: string, opt: string) => {
    const cur = (answers[pid]?.[qid] ?? '').split(',').map(s => s.trim()).filter(Boolean)
    const next = cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt]
    setAnswer(pid, qid, next.join(', '))
  }

  // Effective value: typed answer if present, else a profile pre-fill.
  const eff = (p: PromptDef, q: Question): string => {
    const a = answers[p.id]?.[q.id]
    if (a !== undefined) return a
    if (q.prefillFrom === 'homeAirport') return profile.homeAirport ?? ''
    if (q.prefillFrom === 'homeCountry') return profile.homeCountry ?? ''
    return ''
  }

  const effAnswers = (p: PromptDef): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const q of p.questions) out[q.id] = eff(p, q)
    return out
  }

  const requiredFilled = (p: PromptDef): boolean =>
    p.questions.every(q => q.optional || eff(p, q).trim().length > 0)

  const generated = (p: PromptDef): string => p.build(effAnswers(p), liveProfile())

  const copyPrompt = async (p: PromptDef) => {
    try {
      await navigator.clipboard.writeText(generated(p))
      setCopiedId(p.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      window.prompt('Copy this prompt:', generated(p))
    }
  }

  const visiblePrompts = useMemo(
    () => PROMPTS.filter(p => p.category === activeCat),
    [activeCat],
  )

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
  const chipCls = (on: boolean) =>
    `inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
      on ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
    }`

  // One question's input control (multiselect chips / textarea / select
  // / text+datalist / number).
  const renderField = (p: PromptDef, q: Question) => {
    if (q.type === 'multiselect') {
      const selected = eff(p, q).split(',').map(s => s.trim()).filter(Boolean)
      return (
        <div className="flex flex-wrap gap-2">
          {q.options?.map(o => {
            const on = selected.includes(o)
            return (
              <button key={o} type="button" onClick={() => toggleMulti(p.id, q.id, o)} aria-pressed={on} className={chipCls(on)}>
                {on && <Check className="w-3 h-3" />} {o}
              </button>
            )
          })}
        </div>
      )
    }
    if (q.type === 'textarea') {
      return (
        <textarea
          rows={4}
          value={eff(p, q)}
          onChange={e => setAnswer(p.id, q.id, e.target.value)}
          placeholder={q.placeholder}
          className={`${inputCls} leading-relaxed`}
        />
      )
    }
    if (q.type === 'select') {
      return (
        <select
          value={eff(p, q)}
          onChange={e => setAnswer(p.id, q.id, e.target.value)}
          className={`${inputCls} bg-white`}
        >
          <option value="" disabled>Choose…</option>
          {q.options?.map(o => <option key={o}>{o}</option>)}
        </select>
      )
    }
    const listId = q.suggestions ? `dl-${p.id}-${q.id}` : undefined
    return (
      <>
        <input
          type={q.type === 'number' ? 'number' : 'text'}
          list={listId}
          value={eff(p, q)}
          onChange={e => setAnswer(p.id, q.id, e.target.value)}
          placeholder={q.placeholder}
          className={inputCls}
        />
        {q.suggestions && (
          <datalist id={listId}>
            {q.suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Admin-only work-in-progress banner. Goes away with the gate. */}
        <div className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
          <Lock className="w-3.5 h-3.5" /> Admin preview — hidden from the public
        </div>

        {/* INTRO */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">
            <Sparkles className="w-4 h-4" /> AI Travel Prompt Builder
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Travel smarter with AI prompts
          </h1>
          <p className="text-gray-500 mt-2 leading-relaxed">
            Answer a few questions and we&apos;ll build a sharp, ready-to-use prompt.
            Copy it into ChatGPT, Claude or any AI tool to plan better trips in seconds.
          </p>
        </div>

        {/* FAMILY PROFILE */}
        <div className="mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-brand-600" />
            <h2 className="font-bold text-gray-900">Your family</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Set this once and every prompt fills it in for you.
          </p>

          <div className="space-y-4">
            {/* Adults */}
            <div className="sm:w-1/2 sm:pr-1.5">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Adults</span>
              <input
                type="number" min={1} max={12}
                value={profile.adults ?? ''}
                onChange={e => updateProfile({ adults: e.target.value ? parseInt(e.target.value, 10) : null })}
                placeholder="e.g. 2"
                className={inputCls}
              />
            </div>

            {/* Kids — one input per kid + add another */}
            <div>
              <span className="block text-xs font-semibold text-gray-600 mb-1">Kids&apos; ages</span>
              <div className="space-y-2">
                {kids.map((age, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="number" min={0} max={17}
                      value={age}
                      onChange={e => updateKid(i, e.target.value)}
                      placeholder={`Kid ${i + 1} age`}
                      className={`${inputCls} sm:w-1/2`}
                    />
                    {kids.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeKid(i)}
                        aria-label={`Remove kid ${i + 1}`}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addKid}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add another kid
              </button>
            </div>

            {/* Home country + currency (pickers, no free typing) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block text-xs font-semibold text-gray-600 mb-1">Home country <span className="text-gray-400 font-normal">(optional)</span></span>
                <select
                  value={profile.homeCountry ?? ''}
                  onChange={e => updateProfile({ homeCountry: e.target.value || null })}
                  className={`${inputCls} bg-white`}
                >
                  <option value="">Select…</option>
                  {COUNTRY_NAMES.map(n => <option key={n}>{n}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="block text-xs font-semibold text-gray-600 mb-1">Home currency <span className="text-gray-400 font-normal">(optional)</span></span>
                <select
                  value={profile.homeCurrency ?? ''}
                  onChange={e => updateProfile({ homeCurrency: e.target.value || null })}
                  className={`${inputCls} bg-white`}
                >
                  <option value="">Select…</option>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>

            {/* Home airport — datalist autocomplete, free text allowed */}
            <label className="text-sm block">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Home airport <span className="text-gray-400 font-normal">(optional)</span></span>
              <input
                type="text"
                list="jft-airports"
                value={profile.homeAirport ?? ''}
                onChange={e => updateProfile({ homeAirport: e.target.value || null })}
                placeholder="Start typing, e.g. Manchester"
                className={`${inputCls} sm:w-1/2`}
              />
              <datalist id="jft-airports">
                {MAJOR_AIRPORTS.map(a => <option key={a} value={a} />)}
              </datalist>
            </label>

            {/* Travel style — multi-select */}
            <div>
              <span className="block text-xs font-semibold text-gray-600 mb-1">Travel style <span className="text-gray-400 font-normal">(pick any)</span></span>
              <div className="flex flex-wrap gap-2">
                {TRAVEL_STYLES.map(s => (
                  <button key={s} type="button" onClick={() => toggleStyle(s)} aria-pressed={profile.travelStyle.includes(s)} className={chipCls(profile.travelStyle.includes(s))}>
                    {profile.travelStyle.includes(s) && <Check className="w-3 h-3" />} {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={saveProfile}
              disabled={savingProfile}
              className="btn-primary !text-sm !py-2 !px-4 disabled:opacity-50"
            >
              {profileSaved ? <><Check className="w-4 h-4" /> Saved</> : 'Save profile'}
            </button>
            {!isLoggedIn && (
              <span className="text-xs text-gray-500">
                Saved on this device.{' '}
                <Link href="/signup" className="text-brand-600 font-semibold hover:underline">
                  Create a free profile
                </Link>{' '}to save it everywhere.
              </span>
            )}
          </div>
        </div>

        {/* CATEGORY GRID — every category visible at once, no sideways
            scrolling. 2 columns on phones, 3 on larger screens. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
          {CATEGORIES.map(c => {
            const count = PROMPTS.filter(p => p.category === c.id).length
            const active = activeCat === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { setActiveCat(c.id); setOpenId(null) }}
                aria-pressed={active}
                className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-colors ${
                  active
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-gray-200 text-gray-800 hover:border-brand-300'
                }`}
              >
                <span className="text-2xl leading-none" aria-hidden>{c.emoji}</span>
                <span className="text-sm font-semibold leading-tight">{c.label}</span>
                <span className={`text-[11px] ${active ? 'text-white/80' : 'text-gray-400'}`}>
                  {count} prompt{count !== 1 ? 's' : ''}
                </span>
              </button>
            )
          })}
        </div>

        {/* PROMPT CARDS */}
        <ul className="space-y-3">
          {visiblePrompts.map(p => {
            const open = openId === p.id
            const canCopy = requiredFilled(p)
            const rel = open ? relatedFor(related, effAnswers(p)) : []
            return (
              <li key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Card header — toggles open */}
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : p.id)}
                  className="w-full text-left p-5 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">{p.title}</h3>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          p.badge === 'web' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'
                        }`}
                        title={BADGE_NOTE[p.badge]}
                      >
                        {p.badge === 'web' ? <Globe className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                        {BADGE_LABEL[p.badge]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{p.useCase}</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {/* Build-it panel */}
                {open && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                    {p.questions.map(q => (
                      <div key={q.id}>
                        <span className="block text-xs font-semibold text-gray-600 mb-1">
                          {q.label}{q.optional && <span className="text-gray-400 font-normal"> (optional)</span>}
                        </span>
                        {renderField(p, q)}
                      </div>
                    ))}

                    {/* Live preview + copy */}
                    {canCopy ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-600 inline-flex items-center gap-1.5">
                            <Wand2 className="w-3.5 h-3.5 text-brand-600" /> Your prompt
                          </span>
                          <button
                            type="button"
                            onClick={() => copyPrompt(p)}
                            className="btn-primary !text-xs !py-1.5 !px-3"
                          >
                            {copiedId === p.id
                              ? <><Check className="w-3.5 h-3.5" /> Copied</>
                              : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                          </button>
                        </div>
                        <pre className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 whitespace-pre-wrap font-mono leading-relaxed">
{generated(p)}
                        </pre>
                        <p className="text-[11px] text-gray-400 mt-2">{BADGE_NOTE[p.badge]}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Fill in the questions above to build your prompt.</p>
                    )}

                    {/* Related guides + blog posts, matched to the
                        destination the user typed. */}
                    {rel.length > 0 && (
                      <div className="text-xs bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                        <span className="font-semibold text-gray-700 inline-flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-brand-600" /> From Jax Family Travels
                        </span>
                        <ul className="mt-1.5 space-y-1">
                          {rel.map(r => (
                            <li key={r.href}>
                              <Link href={r.href} className="text-brand-600 hover:underline">
                                {r.type === 'guide' ? 'Guide: ' : ''}{r.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Soft cross-link to our own products (human-facing). */}
                    {p.crossLink && (
                      <div className="text-xs bg-brand-50 border border-brand-100 rounded-md px-3 py-2 text-gray-600 leading-relaxed">
                        <Sparkles className="inline w-3.5 h-3.5 text-brand-600 mr-1 -mt-0.5" />
                        {p.crossLink.text}{' '}
                        {p.crossLink.links.map((l, i) => (
                          <span key={l.href}>
                            {i > 0 && <span className="text-gray-400"> &amp; </span>}
                            <Link href={l.href} className="text-brand-600 font-semibold hover:underline">{l.label}</Link>
                          </span>
                        ))}
                        .
                      </div>
                    )}

                    {/* Clear / start over */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => clearPrompt(p.id)}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
                      >
                        <X className="w-3.5 h-3.5" /> Clear &amp; start over
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {/* SOFT CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">Want done-for-you itineraries and guides?</p>
          <Link href="/guides" className="btn-primary !inline-flex mt-3">
            Explore our travel guides
          </Link>
        </div>
      </div>
    </div>
  )
}
