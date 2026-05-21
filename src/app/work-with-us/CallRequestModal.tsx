'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Loader2, X } from 'lucide-react'

const JOURNEY_STAGES = [
  { value: 'dreaming', label: 'Dreaming about it', desc: 'No firm plans yet, just wondering if it\'s possible' },
  { value: 'planning', label: 'Actively planning', desc: 'Saving, timing, picking destinations' },
  { value: 'soon', label: 'Leaving soon', desc: 'Departure date in the next few months' },
  { value: 'already', label: 'Already on the road', desc: 'Travelling and want to talk through a specific issue' },
]

const DAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

const TIMES = [
  { value: 'morning',   label: 'Morning',   sub: 'Before noon (UK)' },
  { value: 'afternoon', label: 'Afternoon', sub: '12pm to 5pm (UK)' },
  { value: 'evening',   label: 'Evening',   sub: 'After 5pm (UK)' },
]

type Props = {
  open: boolean
  onClose: () => void
  // Pre-fill from session when we have it. Empty strings if signed
  // out, the modal trigger handles that with a redirect to /login.
  defaultName: string
  defaultEmail: string
}

export default function CallRequestModal({ open, onClose, defaultName, defaultEmail }: Props) {
  const router = useRouter()

  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [familySituation, setFamilySituation] = useState('')
  const [whereNow, setWhereNow] = useState('')
  const [journeyStage, setJourneyStage] = useState('')
  const [whatToDiscuss, setWhatToDiscuss] = useState('')
  const [timezone, setTimezone] = useState('')
  const [days, setDays] = useState<Set<string>>(() => new Set())
  const [times, setTimes] = useState<Set<string>>(() => new Set())

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  // Lock body scroll while the modal is up.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Escape closes the modal.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const toggle = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setter(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/call-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          family_situation: familySituation,
          where_now: whereNow,
          journey_stage: journeyStage,
          what_to_discuss: whatToDiscuss,
          timezone,
          preferred_days: Array.from(days),
          preferred_times: Array.from(times),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setSent(true)
      // Refresh server state so /account picks up the new thread.
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const inputCls = 'w-full text-sm px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
  const chip = (active: boolean) =>
    `inline-flex items-center justify-center text-xs font-semibold px-3 py-2 rounded-full border transition-colors cursor-pointer select-none ${
      active
        ? 'bg-brand-600 text-white border-brand-600'
        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300'
    }`

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Book a 1:1 call"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 sm:px-8 py-4 flex items-start justify-between gap-4 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Book a 1:1 with us</h2>
            <p className="text-xs text-gray-500 mt-0.5">No commitment yet. We'll reply with availability and pricing.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 -mr-2 -mt-1 p-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-brand-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Thanks, we'll be in touch</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
              You'll find this conversation in your account, we'll reply there with proposed times and pricing.
            </p>
            <button type="button" onClick={onClose} className="btn-primary !text-sm">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 sm:p-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name *</label>
                <input value={name} onChange={e => setName(e.target.value)} required placeholder="Bec and Oli" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your family</label>
              <input value={familySituation} onChange={e => setFamilySituation(e.target.value)} placeholder="e.g. 2 adults, 2 kids (ages 6 and 9), UK based" className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Where you are now</label>
              <input value={whereNow} onChange={e => setWhereNow(e.target.value)} placeholder="e.g. Manchester, UK" className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Where you are in the journey</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {JOURNEY_STAGES.map(s => (
                  <label key={s.value} className={`cursor-pointer rounded-lg border p-3 transition-colors ${journeyStage === s.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-brand-300'}`}>
                    <input type="radio" name="journeyStage" value={s.value} checked={journeyStage === s.value} onChange={e => setJourneyStage(e.target.value)} className="sr-only" />
                    <p className="font-semibold text-sm text-gray-900">{s.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{s.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">What you'd like to discuss *</label>
              <textarea value={whatToDiscuss} onChange={e => setWhatToDiscuss(e.target.value)} required rows={4} placeholder="A few sentences about what's on your mind, questions, blockers, decisions you're trying to make." className={`${inputCls} resize-y`} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Days that work for you</label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggle(days, d.value, setDays)}
                    className={chip(days.has(d.value))}
                    aria-pressed={days.has(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">Pick any that work, we'll propose specific times from your selection.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Times of day (UK)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TIMES.map(t => {
                  const active = times.has(t.value)
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => toggle(times, t.value, setTimes)}
                      aria-pressed={active}
                      className={`text-left rounded-lg border p-3 transition-colors ${active ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-brand-300'}`}
                    >
                      <p className="font-semibold text-sm text-gray-900">{t.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.sub}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your timezone</label>
              <input value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="e.g. GMT, EST, +8 GMT (Kuala Lumpur)" className={inputCls} />
              <p className="text-[11px] text-gray-400 mt-1.5">Helps us match a slot. UK office hours by default.</p>
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center h-12 text-base disabled:opacity-60">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                : <>Send request <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
