'use client'

// Fast, shareable, no-signup quiz. Deliberately lighter-weight than the
// Family Way tool: six questions, straight tally, no gating anywhere in
// the flow. A result is shareable via ?type=<id>, loading that URL jumps
// straight to the result screen so a shared link actually shows the
// thing that was shared, not the quiz intro.

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight, Check, Loader2, RotateCcw, Share2, Sparkles,
  ClipboardList, Shuffle, Home, Mountain, PiggyBank, Heart, type LucideIcon,
} from 'lucide-react'
import NewsletterSignup from '@/components/NewsletterSignup'
import {
  QUIZ_QUESTIONS,
  TRAVELLER_TYPES,
  TRAVELLER_TYPE_ORDER,
  tallyResult,
  type TravellerTypeId,
} from './quiz-data'

// Per-type visual identity, kept separate from quiz-data.ts since that
// file is pure copy. Tailwind needs full literal class strings (not
// built from a variable) to pick them up at build time, so this can't
// be collapsed into a single "color name" field.
type TypeStyle = {
  Icon: LucideIcon
  accentText: string
  badgeBg: string
  cardBg: string
  cardBorder: string
}
const TYPE_STYLE: Record<TravellerTypeId, TypeStyle> = {
  planner:    { Icon: ClipboardList, accentText: 'text-blue-700',   badgeBg: 'bg-blue-600',   cardBg: 'bg-blue-50',   cardBorder: 'border-blue-100' },
  wanderer:   { Icon: Shuffle,       accentText: 'text-violet-700', badgeBg: 'bg-violet-600', cardBg: 'bg-violet-50', cardBorder: 'border-violet-100' },
  settler:    { Icon: Home,          accentText: 'text-brand-700',  badgeBg: 'bg-brand-600',  cardBg: 'bg-brand-50',  cardBorder: 'border-brand-100' },
  adventurer: { Icon: Mountain,      accentText: 'text-orange-700', badgeBg: 'bg-orange-600', cardBg: 'bg-orange-50', cardBorder: 'border-orange-100' },
  hacker:     { Icon: PiggyBank,     accentText: 'text-amber-700',  badgeBg: 'bg-amber-600',  cardBg: 'bg-amber-50',  cardBorder: 'border-amber-100' },
  comfort:    { Icon: Heart,         accentText: 'text-rose-700',   badgeBg: 'bg-rose-600',   cardBg: 'bg-rose-50',   cardBorder: 'border-rose-100' },
}

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
  const [shareState, setShareState] = useState<'idle' | 'working' | 'done'>('idle')
  const [doneLabel, setDoneLabel] = useState('')

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

  const finishDone = (label: string) => {
    setDoneLabel(label)
    setShareState('done')
    setTimeout(() => setShareState('idle'), 2200)
  }

  // Fetches the 9:16 branded result card and hands it to the native
  // share sheet as an actual image file where that's supported (mobile
  // Safari/Chrome, e.g. sharing straight to Instagram Stories or
  // WhatsApp), otherwise downloads the PNG so it can be shared by hand.
  const share = async () => {
    if (!resultId || shareState === 'working') return
    setShareState('working')
    const cardUrl = `${window.location.origin}/what-kind-of-traveller-are-you/card?type=${resultId}`
    const pageUrl = `${window.location.origin}/what-kind-of-traveller-are-you?type=${resultId}`
    const title = `I got ${TRAVELLER_TYPES[resultId].name} on the Jax Family Travels quiz`

    try {
      const res = await fetch(cardUrl)
      if (!res.ok) throw new Error('Card image request failed')
      const blob = await res.blob()
      const file = new File([blob], 'my-traveller-type.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text: title, url: pageUrl })
        setShareState('idle')
        return
      }

      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = 'my-traveller-type.png'
      a.click()
      URL.revokeObjectURL(objectUrl)
      finishDone('Image downloaded')
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // User dismissed the native share sheet, not a failure.
        setShareState('idle')
        return
      }
      try {
        await navigator.clipboard.writeText(pageUrl)
        finishDone('Link copied')
      } catch {
        setShareState('idle')
      }
    }
  }

  if (phase === 'intro') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-[2rem] bg-gradient-to-br from-blue-800 to-brand-600 text-white p-10 sm:p-14 text-center shadow-xl shadow-brand-900/10">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-white/80 mb-5">
            <Sparkles className="w-3.5 h-3.5" /> 6 questions, about a minute
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">What Kind of Traveller Are You?</h1>
          <p className="text-white/80 leading-relaxed mb-9 max-w-sm mx-auto">
            Six quick questions about how you actually travel, not how you think you&apos;re supposed to. No email needed to see your result.
          </p>
          <button
            onClick={start}
            className="inline-flex items-center gap-2 bg-white text-brand-700 px-7 py-3 rounded-lg font-bold hover:bg-white/90 transition-colors cursor-pointer mx-auto"
          >
            Start the quiz <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'question') {
    const index = answers.length
    const q = QUIZ_QUESTIONS[index]
    const progress = Math.round((index / QUIZ_QUESTIONS.length) * 100)
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7 sm:p-10">
          <div className="flex items-center justify-between text-xs font-bold tracking-wide text-gray-400 mb-2.5">
            <span>QUESTION {index + 1} OF {QUIZ_QUESTIONS.length}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 mb-8 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-700 to-brand-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-7 leading-snug">{q.prompt}</h2>
          <div className="flex flex-col gap-2.5">
            {q.options.map(opt => (
              <button
                key={opt.type}
                onClick={() => answer(opt.type)}
                className="text-left px-4.5 py-4 rounded-xl border-2 border-gray-100 hover:border-brand-400 hover:bg-brand-50/50 hover:-translate-y-0.5 hover:shadow-sm transition-all text-sm font-medium text-gray-800"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // phase === 'result'
  const result = resultId ? TRAVELLER_TYPES[resultId] : TRAVELLER_TYPES[TRAVELLER_TYPE_ORDER[0]]
  const style = TYPE_STYLE[result.id]
  const ResultIcon = style.Icon
  return (
    <div className="max-w-lg mx-auto">
      <div className={`rounded-[2rem] border ${style.cardBorder} ${style.cardBg} p-8 sm:p-10 text-center mb-6`}>
        <div className={`w-16 h-16 rounded-2xl ${style.badgeBg} flex items-center justify-center mx-auto mb-5 shadow-sm`}>
          <ResultIcon className="w-8 h-8 text-white" />
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-gray-400 mb-2">
          Your result
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{result.name}</h1>
        <p className={`font-semibold leading-relaxed mb-5 ${style.accentText}`}>{result.tagline}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {result.traits.map(t => (
            <span key={t} className="text-xs font-semibold text-gray-600 bg-white/70 border border-gray-200 rounded-full px-3 py-1.5">
              {t}
            </span>
          ))}
        </div>
      </div>

      <p className="text-gray-700 leading-relaxed mb-7 px-1">{result.description}</p>

      <div className="flex flex-col sm:flex-row gap-2.5 mb-8">
        <button onClick={share} disabled={shareState === 'working'} className="btn-outline justify-center flex-1 !py-2.5 disabled:opacity-60">
          {shareState === 'working' && (<><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>)}
          {shareState === 'done' && (<><Check className="w-4 h-4" /> {doneLabel}</>)}
          {shareState === 'idle' && (<><Share2 className="w-4 h-4" /> Share your result</>)}
        </button>
        <button onClick={retake} className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 px-4 py-2.5">
          <RotateCcw className="w-4 h-4" /> {arrivedViaShare ? 'Take the quiz' : 'Retake'}
        </button>
      </div>

      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-3 px-1">Pairs well with</p>
        <div className="flex flex-col gap-2.5">
          {result.relatedLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-5 py-4 hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <span className="text-sm font-semibold text-gray-800 group-hover:text-brand-700">{l.title}</span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-600 shrink-0 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
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
