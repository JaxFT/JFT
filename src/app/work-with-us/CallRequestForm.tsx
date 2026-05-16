'use client'

import { useState } from 'react'
import { ArrowRight, Check, Loader2 } from 'lucide-react'

const JOURNEY_STAGES = [
  { value: 'dreaming', label: 'Dreaming about it', desc: 'No firm plans yet, just wondering if it\'s possible' },
  { value: 'planning', label: 'Actively planning', desc: 'Saving, timing, picking destinations' },
  { value: 'soon', label: 'Leaving soon', desc: 'Departure date in the next few months' },
  { value: 'already', label: 'Already on the road', desc: 'Travelling and want to talk through a specific issue' },
]

export default function CallRequestForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [familySituation, setFamilySituation] = useState('')
  const [whereNow, setWhereNow] = useState('')
  const [journeyStage, setJourneyStage] = useState('')
  const [whatToDiscuss, setWhatToDiscuss] = useState('')
  const [timezone, setTimezone] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

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
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit')
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-brand-700" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Thanks — we'll be in touch</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          We've got your details. Expect an email from Bec or Oli within 48 hours with availability and pricing.
        </p>
      </div>
    )
  }

  const inputCls = 'w-full text-base px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Bec and Oli"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Your family</label>
        <input
          value={familySituation}
          onChange={e => setFamilySituation(e.target.value)}
          placeholder="e.g. 2 adults, 2 kids (ages 6 and 9), UK based"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Where you are now</label>
        <input
          value={whereNow}
          onChange={e => setWhereNow(e.target.value)}
          placeholder="e.g. Manchester, UK"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Where you are in the journey</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {JOURNEY_STAGES.map(s => (
            <label
              key={s.value}
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                journeyStage === s.value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 bg-white hover:border-brand-300'
              }`}
            >
              <input
                type="radio"
                name="journeyStage"
                value={s.value}
                checked={journeyStage === s.value}
                onChange={e => setJourneyStage(e.target.value)}
                className="sr-only"
              />
              <p className="font-semibold text-sm text-gray-900">{s.label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{s.desc}</p>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          What you'd like to discuss *
        </label>
        <textarea
          value={whatToDiscuss}
          onChange={e => setWhatToDiscuss(e.target.value)}
          required
          rows={5}
          placeholder="A few sentences about what's on your mind — questions, blockers, decisions you're trying to make."
          className={`${inputCls} resize-y`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Your timezone</label>
        <input
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          placeholder="e.g. GMT, EST, +8 GMT (Kuala Lumpur)"
          className={inputCls}
        />
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full justify-center h-12 text-base disabled:opacity-60"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
        ) : (
          <>Send request <ArrowRight className="w-4 h-4" /></>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        No payment required to enquire. We'll reply with availability and pricing.
      </p>
    </form>
  )
}
