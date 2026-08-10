'use client'

// Fast, shareable, no-signup quiz. Deliberately lighter-weight than the
// Family Way tool: six questions, straight tally, no gating anywhere in
// the flow. A result is shareable via ?type=<id>, loading that URL jumps
// straight to the result screen so a shared link actually shows the
// thing that was shared, not the quiz intro.

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, RotateCcw, Share2, Sparkles } from 'lucide-react'
import NewsletterSignup from '@/components/NewsletterSignup'
import {
  QUIZ_QUESTIONS,
  TRAVELLER_TYPES,
  TRAVELLER_TYPE_ORDER,
  tallyResult,
  type TravellerTypeId,
} from './quiz-data'

export default function QuizClient() {
  return (
    <Suspense fallback={null}>
      <QuizInner />
    </Suspense>
  )
}

function isValidType(v: string | null): v is TravellerTypeId {
  return !!v && (TRAVELLER_TYPE_ORDER as string[]).includes(v)
}

function QuizInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sharedType = searchParams.get('type')

  const [phase, setPhase] = useState<'intro' | 'question' | 'result'>(
    isValidType(sharedType) ? 'result' : 'intro',
  )
  const [answers, setAnswers] = useState<TravellerTypeId[]>([])
  const [resultId, setResultId] = useState<TravellerTypeId | null>(
    isValidType(sharedType) ? sharedType : null,
  )
  const [arrivedViaShare, setArrivedViaShare] = useState(isValidType(sharedType))
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle')

  const start = () => {
    setAnswers([])
    setPhase('question')
  }

  const answer = (type: TravellerTypeId) => {
    const next = [...answers, type]
    setAnswers(next)
    if (next.length === QUIZ_QUESTIONS.length) {
      const winner = tallyResult(next)
      setResultId(winner)
      setArrivedViaShare(false)
      setPhase('result')
      router.replace(`/what-kind-of-traveller-are-you?type=${winner}`, { scroll: false })
    }
  }

  const retake = () => {
    setAnswers([])
    setResultId(null)
    router.replace('/what-kind-of-traveller-are-you', { scroll: false })
    setPhase('question')
  }

  const share = async () => {
    const url = `${window.location.origin}/what-kind-of-traveller-are-you?type=${resultId}`
    const title = resultId ? `I got ${TRAVELLER_TYPES[resultId].name} on the Jax Family Travels quiz` : 'What kind of traveller are you?'
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // User cancelled the native share sheet, fall through to nothing.
        return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 2000)
    } catch {
      // Clipboard denied, nothing else reasonable to do here.
    }
  }

  if (phase === 'intro') {
    return (
      <div className="max-w-lg mx-auto text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-brand-600 mb-4">
          <Sparkles className="w-3.5 h-3.5" /> 6 questions, about a minute
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">What Kind of Traveller Are You?</h1>
        <p className="text-gray-600 leading-relaxed mb-8">
          Six quick questions about how you actually travel, not how you think you&apos;re supposed to. No email needed to see your result.
        </p>
        <button onClick={start} className="btn-primary text-base px-7 py-3 mx-auto">
          Start the quiz <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  if (phase === 'question') {
    const index = answers.length
    const q = QUIZ_QUESTIONS[index]
    const progress = Math.round((index / QUIZ_QUESTIONS.length) * 100)
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-400 mb-2">
          <span>Question {index + 1} of {QUIZ_QUESTIONS.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 mb-8 overflow-hidden">
          <div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">{q.prompt}</h2>
        <div className="flex flex-col gap-2.5">
          {q.options.map(opt => (
            <button
              key={opt.type}
              onClick={() => answer(opt.type)}
              className="text-left px-4 py-3.5 rounded-xl border border-gray-200 hover:border-brand-500 hover:bg-brand-50/60 transition-colors text-sm font-medium text-gray-800"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // phase === 'result'
  const result = resultId ? TRAVELLER_TYPES[resultId] : TRAVELLER_TYPES[TRAVELLER_TYPE_ORDER[0]]
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-brand-600 mb-3">
          Your result
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{result.name}</h1>
        <p className="text-brand-700 font-semibold leading-relaxed">{result.tagline}</p>
      </div>

      <p className="text-gray-700 leading-relaxed mb-8">{result.description}</p>

      <div className="flex flex-col sm:flex-row gap-2.5 mb-8">
        <button onClick={share} className="btn-outline justify-center flex-1 !py-2.5">
          {shareState === 'copied' ? (<><Check className="w-4 h-4" /> Link copied</>) : (<><Share2 className="w-4 h-4" /> Share your result</>)}
        </button>
        <button onClick={retake} className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 px-4 py-2.5">
          <RotateCcw className="w-4 h-4" /> {arrivedViaShare ? 'Take the quiz' : 'Retake'}
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-sand-50 p-6 mb-8">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-3">Pairs well with</p>
        <ul className="space-y-2">
          {result.relatedLinks.map(l => (
            <li key={l.href}>
              <Link href={l.href} className="text-sm font-semibold text-brand-700 hover:underline underline-offset-2">
                {l.title} <ArrowRight className="w-3 h-3 inline" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-8">
        <NewsletterSignup source="quiz_result" />
      </div>

      <p className="text-center text-sm text-gray-500">
        Want the deeper dive, not just a personality type?{' '}
        <Link href="/i-want-to-travel" className="text-brand-600 font-semibold hover:underline">
          Take the Family Way assessment
        </Link>
      </p>
    </div>
  )
}
