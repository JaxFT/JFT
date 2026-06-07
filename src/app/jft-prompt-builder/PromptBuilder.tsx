'use client'

// JFT Prompt Builder — client island.
//
// Browse categories → open a prompt → answer its guided questions →
// copy the engineered prompt for your own AI. The "family profile"
// (adults + kids' ages etc.) is captured once and reused across every
// prompt; it lives in localStorage for everyone and also syncs to
// Supabase for signed-in users so it follows them across devices.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, Copy, Check, Globe, Bot, ChevronDown, Users, Wand2, Lock,
} from 'lucide-react'
import {
  CATEGORIES, PROMPTS, BADGE_LABEL, BADGE_NOTE, EMPTY_PROFILE,
  type CategoryId, type FamilyProfile, type PromptDef,
} from '@/lib/jft-prompts'

const LS_KEY = 'jft-family-profile'

type Props = {
  isLoggedIn: boolean
  initialProfile: FamilyProfile
}

function isEmptyProfile(p: FamilyProfile): boolean {
  return !p.adults && p.kidsAges.length === 0 && !p.homeAirport && !p.travelStyle
}

export default function PromptBuilder({ isLoggedIn, initialProfile }: Props) {
  const [profile, setProfile] = useState<FamilyProfile>(initialProfile)
  // Kids' ages edited as free text ("4, 7") then parsed into numbers.
  const [agesText, setAgesText] = useState(initialProfile.kidsAges.join(', '))
  const [profileSaved, setProfileSaved] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  const [activeCat, setActiveCat] = useState<CategoryId>('signature')
  const [openId, setOpenId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // On first mount, if the server gave us nothing (signed out, or no
  // saved row), hydrate from localStorage.
  useEffect(() => {
    if (!isEmptyProfile(initialProfile)) return
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const p = JSON.parse(raw) as FamilyProfile
      setProfile({ ...EMPTY_PROFILE, ...p, kidsAges: Array.isArray(p.kidsAges) ? p.kidsAges : [] })
      setAgesText((p.kidsAges ?? []).join(', '))
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const parseAges = (text: string): number[] =>
    text
      .split(/[,\s]+/)
      .map(s => parseInt(s, 10))
      .filter(n => Number.isFinite(n) && n >= 0 && n <= 17)
      .slice(0, 10)

  const updateProfile = (patch: Partial<FamilyProfile>) => {
    setProfile(prev => ({ ...prev, ...patch }))
    setProfileSaved(false)
  }

  const saveProfile = async () => {
    const toSave: FamilyProfile = { ...profile, kidsAges: parseAges(agesText) }
    setProfile(toSave)
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
            home_airport: toSave.homeAirport,
            travel_style: toSave.travelStyle,
          }),
        })
      }
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch {
      /* localStorage at least succeeded for most cases */
    } finally {
      setSavingProfile(false)
    }
  }

  const setAnswer = (pid: string, qid: string, val: string) =>
    setAnswers(prev => ({ ...prev, [pid]: { ...prev[pid], [qid]: val } }))

  const requiredFilled = (p: PromptDef): boolean =>
    p.questions.every(q => q.optional || (answers[p.id]?.[q.id] ?? '').trim().length > 0)

  const generated = (p: PromptDef): string =>
    p.build(answers[p.id] ?? {}, { ...profile, kidsAges: parseAges(agesText) })

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Adults</span>
              <input
                type="number" min={1} max={12}
                value={profile.adults ?? ''}
                onChange={e => updateProfile({ adults: e.target.value ? parseInt(e.target.value, 10) : null })}
                placeholder="e.g. 2"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Kids&apos; ages</span>
              <input
                type="text"
                value={agesText}
                onChange={e => { setAgesText(e.target.value); setProfileSaved(false) }}
                placeholder="e.g. 4, 7"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Home airport <span className="text-gray-400 font-normal">(optional)</span></span>
              <input
                type="text"
                value={profile.homeAirport ?? ''}
                onChange={e => updateProfile({ homeAirport: e.target.value || null })}
                placeholder="e.g. Manchester (MAN)"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-semibold text-gray-600 mb-1">Travel style <span className="text-gray-400 font-normal">(optional)</span></span>
              <select
                value={profile.travelStyle ?? ''}
                onChange={e => updateProfile({ travelStyle: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">No preference</option>
                <option>Budget</option>
                <option>Mid-range</option>
                <option>Comfort</option>
                <option>Slow travel</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
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

        {/* CATEGORY TABS */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setActiveCat(c.id); setOpenId(null) }}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors ${
                activeCat === c.id
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
              }`}
            >
              <span aria-hidden>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>

        {/* PROMPT CARDS */}
        <ul className="space-y-3">
          {visiblePrompts.map(p => {
            const open = openId === p.id
            const canCopy = requiredFilled(p)
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
                          p.badge === 'web'
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-violet-50 text-violet-700'
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
                      <label key={q.id} className="block">
                        <span className="block text-xs font-semibold text-gray-600 mb-1">
                          {q.label}{q.optional && <span className="text-gray-400 font-normal"> (optional)</span>}
                        </span>
                        {q.type === 'textarea' ? (
                          <textarea
                            rows={4}
                            value={answers[p.id]?.[q.id] ?? ''}
                            onChange={e => setAnswer(p.id, q.id, e.target.value)}
                            placeholder={q.placeholder}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
                          />
                        ) : q.type === 'select' ? (
                          <select
                            value={answers[p.id]?.[q.id] ?? ''}
                            onChange={e => setAnswer(p.id, q.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="" disabled>Choose…</option>
                            {q.options?.map(o => <option key={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input
                            type={q.type === 'number' ? 'number' : 'text'}
                            value={answers[p.id]?.[q.id] ?? ''}
                            onChange={e => setAnswer(p.id, q.id, e.target.value)}
                            placeholder={q.placeholder}
                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        )}
                      </label>
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
