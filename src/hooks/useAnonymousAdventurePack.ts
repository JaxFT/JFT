// Anonymous (no-login) variant of useAdventurePack. Same return shape
// as useAdventurePack so PackShell can render either, but all state
// lives in localStorage instead of the DB. Used by the free France
// pack so visitors can try the product without signing up.
//
// Storage key per pack:
//   jft.anon.adventure-pack.<slug>
// Shape:
//   { ageMode, missionsComplete[], answersBySection }

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AgeMode, SectionAnswers, SectionKey,
} from '@/lib/adventurePackTypes'
import type { UseAdventurePackResult } from './useAdventurePack'

const AGE_MODE_PREF_KEY = 'jft.adventure-pack.ageMode'

function packKey(slug: string): string {
  return `jft.anon.adventure-pack.${slug}`
}

type Stored = {
  ageMode: AgeMode
  missionsComplete: string[]
  answersBySection: Record<string, SectionAnswers>
}

function readStored(slug: string): Stored | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(packKey(slug))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Stored>
    return {
      ageMode: parsed.ageMode === 'older' || parsed.ageMode === 'younger' ? parsed.ageMode : 'younger',
      missionsComplete: Array.isArray(parsed.missionsComplete) ? parsed.missionsComplete : [],
      answersBySection: (parsed.answersBySection && typeof parsed.answersBySection === 'object') ? parsed.answersBySection : {},
    }
  } catch { return null }
}

function writeStored(slug: string, value: Stored) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(packKey(slug), JSON.stringify(value))
  } catch {
    // private mode or storage disabled, nothing to do
  }
}

function readAgeModePref(): AgeMode | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(AGE_MODE_PREF_KEY)
    return v === 'older' || v === 'younger' ? v : null
  } catch { return null }
}

function writeAgeModePref(mode: AgeMode) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(AGE_MODE_PREF_KEY, mode) } catch {}
}

export function useAnonymousAdventurePack(countrySlug: string): UseAdventurePackResult {
  const [ageMode, setAgeMode] = useState<AgeMode>('younger')
  const [missionsComplete, setMissionsComplete] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, SectionAnswers>>({})
  const [loading, setLoading] = useState(true)

  // Hydrate from localStorage on mount. SSR-safe (window only checked
  // inside readStored).
  useEffect(() => {
    const existing = readStored(countrySlug)
    if (existing) {
      setAgeMode(existing.ageMode)
      setMissionsComplete(existing.missionsComplete)
      setAnswers(existing.answersBySection)
    } else {
      // No saved pack yet — defer to the cross-pack age preference.
      const pref = readAgeModePref()
      if (pref) setAgeMode(pref)
    }
    setLoading(false)
  }, [countrySlug])

  // Persist whenever any of the three pieces of state change. localStorage
  // is synchronous and small, no debounce needed.
  const latestRef = useRef({ ageMode, missionsComplete, answers })
  useEffect(() => { latestRef.current = { ageMode, missionsComplete, answers } }, [ageMode, missionsComplete, answers])

  const persist = useCallback(() => {
    if (loading) return
    writeStored(countrySlug, {
      ageMode: latestRef.current.ageMode,
      missionsComplete: latestRef.current.missionsComplete,
      answersBySection: latestRef.current.answers,
    })
  }, [countrySlug, loading])

  const updateAnswer = useCallback((section: SectionKey, key: string, value: unknown) => {
    setAnswers(prev => {
      const sectionAns: SectionAnswers = { ...(prev[section] ?? {}), [key]: value }
      const next = { ...prev, [section]: sectionAns }
      latestRef.current = { ...latestRef.current, answers: next }
      writeStored(countrySlug, {
        ageMode: latestRef.current.ageMode,
        missionsComplete: latestRef.current.missionsComplete,
        answersBySection: next,
      })
      return next
    })
  }, [countrySlug])

  const getAnswer = useCallback(<T,>(section: SectionKey, key: string, fallback: T): T => {
    const v = answers[section]?.[key]
    return (v === undefined ? fallback : (v as T))
  }, [answers])

  const completeMission = useCallback((mission: SectionKey) => {
    setMissionsComplete(prev => {
      if (prev.includes(mission)) return prev
      const next = [...prev, mission]
      latestRef.current = { ...latestRef.current, missionsComplete: next }
      writeStored(countrySlug, {
        ageMode: latestRef.current.ageMode,
        missionsComplete: next,
        answersBySection: latestRef.current.answers,
      })
      return next
    })
  }, [countrySlug])

  const isMissionComplete = useCallback(
    (mission: SectionKey) => missionsComplete.includes(mission),
    [missionsComplete],
  )

  const changeAgeMode = useCallback((mode: AgeMode) => {
    setAgeMode(mode)
    writeAgeModePref(mode)
    latestRef.current = { ...latestRef.current, ageMode: mode }
    persist()
  }, [persist])

  const clearAll = useCallback(async () => {
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(packKey(countrySlug)) } catch {}
    }
    setAnswers({})
    setMissionsComplete([])
    setAgeMode('younger')
  }, [countrySlug])

  return {
    loading,
    ageMode, changeAgeMode,
    missionsComplete, completeMission, isMissionComplete,
    answers, getAnswer, updateAnswer,
    clearAll,
    // No subscription expiry for anonymous use.
    expiresAt: null,
    // Anonymous mode doesn't earn stamps (no profile to attach them to).
    newStamps: [],
    dismissStamp: () => {},
  }
}
