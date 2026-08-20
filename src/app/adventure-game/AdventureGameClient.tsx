'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Volume2, VolumeX, Pause, Play, Lock, ArrowRight, BookOpen, RotateCcw } from 'lucide-react'
import GameCanvas from './GameCanvas'
import { COUNTRIES, getCountry, nextCountry } from '@/lib/game/countries'
import {
  loadLocalProgress, saveLocalProgress, mergeProgress, applyResult, syncProgressToServer,
} from '@/lib/game/progress'
import type { GameProgress } from '@/lib/game/types'
import { isMuted, setMuted as persistMuted } from '@/lib/game/sound'
import PassportStamp from '@/components/passport/PassportStamp'

type Screen = 'menu' | 'playing' | 'results' | 'failed' | 'passport'

type LastResult = {
  slug: string
  score: number
  isNewBest: boolean
  newlyStamped: boolean
  newlyUnlockedSlug?: string
}

const TUTORIAL_KEY = 'jft_game_seen_tutorial'
const STARTING_COUNT = 3

export default function AdventureGameClient({
  serverProgress,
  isLoggedIn,
}: {
  serverProgress: GameProgress | null
  isLoggedIn: boolean
}) {
  const [progress, setProgress] = useState<GameProgress | null>(null)
  const [screen, setScreen] = useState<Screen>('menu')
  const [slug, setSlug] = useState(COUNTRIES[0].slug)
  const [score, setScore] = useState(STARTING_COUNT)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [lastResult, setLastResult] = useState<LastResult | null>(null)

  useEffect(() => {
    const local = loadLocalProgress()
    const merged = serverProgress ? mergeProgress(local, serverProgress) : local
    saveLocalProgress(merged)
    setProgress(merged)
    setMuted(isMuted())
  }, [serverProgress])

  const startLevel = useCallback((countrySlug: string) => {
    setSlug(countrySlug)
    setScore(STARTING_COUNT)
    setPaused(false)
    setScreen('playing')
    if (typeof window !== 'undefined' && !window.localStorage.getItem(TUTORIAL_KEY)) {
      setShowTutorial(true)
      window.localStorage.setItem(TUTORIAL_KEY, '1')
      window.setTimeout(() => setShowTutorial(false), 1800)
    }
  }, [])

  const handleFinish = useCallback((finalScore: number) => {
    setProgress(prev => {
      const base = prev ?? loadLocalProgress()
      const outcome = applyResult(base, slug, finalScore)
      saveLocalProgress(outcome.progress)
      if (isLoggedIn) syncProgressToServer(outcome.progress)
      setLastResult({ slug, score: finalScore, isNewBest: outcome.isNewBest, newlyStamped: outcome.newlyStamped, newlyUnlockedSlug: outcome.newlyUnlockedSlug })
      return outcome.progress
    })
    setScreen('results')
  }, [slug, isLoggedIn])

  const handleFail = useCallback(() => {
    setScreen('failed')
  }, [])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    persistMuted(next)
  }

  if (!progress) return <div className="h-[70vh]" />

  const country = getCountry(slug)!

  return (
    <div className="w-full">
      {screen === 'menu' && (
        <MenuScreen progress={progress} onPlay={startLevel} onPassport={() => setScreen('passport')} />
      )}

      {screen === 'playing' && (
        <div className="relative w-full aspect-[9/16] max-h-[78vh] mx-auto rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-black">
          <GameCanvas
            key={slug}
            config={country}
            startingCount={STARTING_COUNT}
            paused={paused}
            onScoreChange={setScore}
            onFinish={handleFinish}
            onFail={handleFail}
          />

          {/* HUD */}
          <div className="absolute top-0 inset-x-0 p-3 flex items-start justify-between pointer-events-none">
            <div className="pointer-events-auto">
              <p className="text-[10px] font-bold tracking-widest uppercase text-white/80">Jax Family Travels</p>
              <p className="text-white font-bold text-sm flex items-center gap-1">{country.flag} {country.name.toUpperCase()}</p>
            </div>
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <div className="bg-black/40 rounded-full px-3 py-1 text-right">
                <span className="text-white font-extrabold text-lg tabular-nums">{score}</span>
                <span className="text-white/70 text-[10px] ml-1.5">best {progress[slug]?.bestScore ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button onClick={() => setPaused(p => !p)} className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">
                  {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {showTutorial && (
            <div className="absolute inset-x-0 bottom-24 flex justify-center pointer-events-none">
              <div className="bg-white/95 rounded-full px-5 py-2 shadow-lg animate-pulse">
                <span className="font-bold text-gray-900">← DRAG TO AIM →</span>
              </div>
            </div>
          )}

          {paused && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <button onClick={() => setPaused(false)} className="btn-primary">
                <Play className="w-4 h-4" /> Resume
              </button>
            </div>
          )}
        </div>
      )}

      {screen === 'results' && lastResult && (
        <ResultsScreen
          result={lastResult}
          progress={progress}
          onPlayAgain={() => startLevel(lastResult.slug)}
          onNextCountry={() => {
            const next = nextCountry(lastResult.slug)
            if (next) startLevel(next.slug)
          }}
          onPassport={() => setScreen('passport')}
          onMenu={() => setScreen('menu')}
        />
      )}

      {screen === 'failed' && (
        <FailScreen
          slug={slug}
          onPlayAgain={() => startLevel(slug)}
          onMenu={() => setScreen('menu')}
        />
      )}

      {screen === 'passport' && (
        <PassportScreen progress={progress} onBack={() => setScreen('menu')} onPlay={startLevel} />
      )}
    </div>
  )
}

function MenuScreen({ progress, onPlay, onPassport }: { progress: GameProgress; onPlay: (slug: string) => void; onPassport: () => void }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Adventure Game</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">GET THE FAMILY THERE!</h1>
        <p className="text-gray-500 mt-2">How far can your family travel?</p>
      </div>
      <div className="space-y-3">
        {COUNTRIES.map(c => {
          const p = progress[c.slug]
          const unlocked = p?.unlocked
          return (
            <button
              key={c.slug}
              disabled={!unlocked}
              onClick={() => unlocked && onPlay(c.slug)}
              className={`w-full flex items-center justify-between rounded-xl border px-4 py-4 text-left transition-colors ${
                unlocked ? 'border-brand-200 bg-white hover:border-brand-400 cursor-pointer' : 'border-gray-200 bg-gray-50 cursor-not-allowed'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-2xl">{c.flag}</span>
                <span>
                  <span className={`block font-bold ${unlocked ? 'text-gray-900' : 'text-gray-400'}`}>{c.name}</span>
                  <span className="block text-xs text-gray-500">
                    {unlocked ? (p?.bestScore ? `Best: ${p.bestScore}` : 'Not played yet') : 'Locked'}
                  </span>
                </span>
              </span>
              {unlocked ? <ArrowRight className="w-5 h-5 text-brand-600" /> : <Lock className="w-4 h-4 text-gray-400" />}
            </button>
          )
        })}
      </div>
      <button onClick={onPassport} className="btn-outline w-full justify-center mt-6">
        <BookOpen className="w-4 h-4" /> View Passport
      </button>
    </div>
  )
}

function ResultsScreen({
  result, progress, onPlayAgain, onNextCountry, onPassport, onMenu,
}: {
  result: LastResult
  progress: GameProgress
  onPlayAgain: () => void
  onNextCountry: () => void
  onPassport: () => void
  onMenu: () => void
}) {
  const country = getCountry(result.slug)!
  const upcoming = nextCountry(result.slug)
  const upcomingUnlocked = upcoming ? progress[upcoming.slug]?.unlocked : false

  return (
    <div className="max-w-md mx-auto text-center">
      <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">{country.flag} {country.name.toUpperCase()} COMPLETE!</p>
      <p className="text-6xl font-extrabold text-gray-900 my-4 animate-stamp-burst">{result.score}</p>
      <p className="text-gray-600 font-semibold mb-4">BAGS MADE IT TO {country.landmarkLabel.toUpperCase()}</p>

      {result.isNewBest && <p className="text-brand-700 font-bold mb-2">⭐ NEW BEST!</p>}
      <p className="text-sm text-gray-500 mb-6">+{result.score} Adventure Points</p>

      {result.newlyStamped && (
        <div className="flex flex-col items-center mb-6">
          <PassportStamp label={country.name} emoji={country.flag} ink="#2d8163" shape="circle" country={country.name} date={new Date().toISOString()} size="sm" />
          <p className="text-xs text-gray-500 mt-2">{country.name} Passport Stamp Unlocked</p>
        </div>
      )}

      {result.newlyUnlockedSlug && (
        <p className="text-sm bg-brand-50 text-brand-700 rounded-lg py-2 px-3 mb-6">
          🔓 {getCountry(result.newlyUnlockedSlug)?.name} unlocked!
        </p>
      )}

      <div className="space-y-2 mb-6">
        <button onClick={onPlayAgain} className="btn-primary w-full justify-center">
          <RotateCcw className="w-4 h-4" /> Play Again
        </button>
        {upcoming && upcomingUnlocked && (
          <button onClick={onNextCountry} className="btn-outline w-full justify-center">
            Next Country <ArrowRight className="w-4 h-4" />
          </button>
        )}
        <button onClick={onPassport} className="text-sm font-semibold text-brand-700 block w-full py-2">
          View Passport
        </button>
        <button onClick={onMenu} className="text-sm text-gray-400 block w-full">
          Back to countries
        </button>
      </div>

      <Link
        href={`/adventure-packs/${country.slug}`}
        className="block text-sm text-gray-600 border-t border-gray-100 pt-5 hover:text-brand-700"
      >
        Want to see what we actually did in {country.name}?
        <span className="block font-semibold text-brand-700 mt-1">Explore our {country.name} Adventure Pack →</span>
      </Link>
    </div>
  )
}

function FailScreen({ slug, onPlayAgain, onMenu }: { slug: string; onPlayAgain: () => void; onMenu: () => void }) {
  const country = getCountry(slug)!
  return (
    <div className="max-w-md mx-auto text-center">
      <p className="text-5xl mb-3">🧳💥</p>
      <p className="text-xs font-bold tracking-widest uppercase text-red-500 mb-2">Lost in transit</p>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Not this time!</h2>
      <p className="text-gray-500 mb-8">
        Every last bag went missing before reaching {country.landmarkLabel}. {country.flag} {country.name} will still be there when you&apos;re ready to try again.
      </p>
      <div className="space-y-2">
        <button onClick={onPlayAgain} className="btn-primary w-full justify-center">
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
        <button onClick={onMenu} className="text-sm text-gray-400 block w-full py-2">
          Back to countries
        </button>
      </div>
    </div>
  )
}

function PassportScreen({ progress, onBack, onPlay }: { progress: GameProgress; onBack: () => void; onPlay: (slug: string) => void }) {
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-6">Your Adventure Passport</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {COUNTRIES.map(c => {
          const p = progress[c.slug]
          return (
            <div key={c.slug} className="flex flex-col items-center bg-white rounded-xl border border-gray-200 p-4">
              {p?.passportStamp ? (
                <PassportStamp label={c.name} emoji={c.flag} ink="#2d8163" shape="circle" country={c.name} size="sm" />
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-2xl opacity-40">
                  {c.flag}
                </div>
              )}
              <p className="text-sm font-semibold text-gray-900 mt-2">{c.name}</p>
              <p className="text-xs text-gray-500">{p?.bestScore ? `Best: ${p.bestScore}` : p?.unlocked ? 'Not played yet' : 'Locked'}</p>
              {p?.unlocked && (
                <button onClick={() => onPlay(c.slug)} className="text-xs font-bold text-brand-700 mt-2">Play →</button>
              )}
            </div>
          )
        })}
      </div>
      <button onClick={onBack} className="btn-outline w-full justify-center">Back to countries</button>
    </div>
  )
}
