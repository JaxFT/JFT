// Kid-mode counterpart to useAdventurePack. Same interface, same UX,
// different data source: every read/write goes through token-validated
// API routes under /api/kid/[token]/pack/[slug]/* using the service
// role server-side, since kids never authenticate.

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AgeMode, SectionAnswers, SectionKey,
} from '@/lib/adventurePackTypes'
import type { UseAdventurePackResult } from './useAdventurePack'

const SAVE_DEBOUNCE_MS = 1000

// Same sticky cross-pack default as adult mode. Per-pack saved
// sessions always win once they exist.
const AGE_MODE_PREF_KEY = 'jft.adventure-pack.ageMode'
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

export function useKidAdventurePack(token: string, countrySlug: string): UseAdventurePackResult {
  const [ageMode, setAgeMode] = useState<AgeMode>('younger')
  const [missionsComplete, setMissionsComplete] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, SectionAnswers>>({})
  const [loading, setLoading] = useState(true)

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const latestAnswers = useRef<Record<string, SectionAnswers>>({})

  // Build the API path once; everything keys off this.
  const base = `/api/kid/${encodeURIComponent(token)}/pack/${encodeURIComponent(countrySlug)}`

  useEffect(() => {
    let mounted = true
    fetch(base)
      .then(r => r.json())
      .then(loaded => {
        if (!mounted) return
        const initialMode = loaded.hasSession
          ? (loaded.ageMode as AgeMode)
          : (readAgeModePref() ?? (loaded.ageMode as AgeMode))
        setAgeMode(initialMode)
        setMissionsComplete(Array.isArray(loaded.missionsComplete) ? loaded.missionsComplete : [])
        const ans = (loaded.answersBySection ?? {}) as Record<string, SectionAnswers>
        setAnswers(ans)
        latestAnswers.current = ans
        setLoading(false)
      })
      .catch(() => {
        // Silent fail — empty state will render and saves will retry
        // when the user does anything.
        setLoading(false)
      })
    return () => { mounted = false }
  }, [base])

  useEffect(() => {
    const timers = saveTimers.current
    return () => {
      for (const t of Object.values(timers)) clearTimeout(t)
    }
  }, [])

  const flushSection = useCallback((section: SectionKey, snapshot: SectionAnswers) => {
    fetch(`${base}/section/${encodeURIComponent(section)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    }).catch(() => null)
  }, [base])

  const updateAnswer = useCallback((section: SectionKey, key: string, value: unknown) => {
    setAnswers(prev => {
      const sectionAns: SectionAnswers = { ...(prev[section] ?? {}), [key]: value }
      const next = { ...prev, [section]: sectionAns }
      latestAnswers.current = next

      if (saveTimers.current[section]) clearTimeout(saveTimers.current[section])
      saveTimers.current[section] = setTimeout(() => {
        flushSection(section, latestAnswers.current[section] ?? {})
      }, SAVE_DEBOUNCE_MS)

      return next
    })
  }, [flushSection])

  const getAnswer = useCallback(<T,>(section: SectionKey, key: string, fallback: T): T => {
    const v = answers[section]?.[key]
    return (v === undefined ? fallback : (v as T))
  }, [answers])

  const persistSession = useCallback((mode: AgeMode, missions: string[]) => {
    fetch(`${base}/session`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age_mode: mode, missions_complete: missions }),
    }).catch(() => null)
  }, [base])

  const completeMission = useCallback((mission: SectionKey) => {
    setMissionsComplete(prev => {
      if (prev.includes(mission)) return prev
      const next = [...prev, mission]
      persistSession(ageMode, next)
      return next
    })
  }, [ageMode, persistSession])

  const isMissionComplete = useCallback(
    (mission: SectionKey) => missionsComplete.includes(mission),
    [missionsComplete],
  )

  const changeAgeMode = useCallback((mode: AgeMode) => {
    setAgeMode(mode)
    writeAgeModePref(mode)
    persistSession(mode, missionsComplete)
  }, [missionsComplete, persistSession])

  const clearAll = useCallback(async () => {
    for (const t of Object.values(saveTimers.current)) clearTimeout(t)
    saveTimers.current = {}
    await fetch(base, { method: 'DELETE' }).catch(() => null)
    latestAnswers.current = {}
    setAnswers({})
    setMissionsComplete([])
    setAgeMode('younger')
  }, [base])

  return {
    loading,
    ageMode, changeAgeMode,
    missionsComplete, completeMission, isMissionComplete,
    answers, getAnswer, updateAnswer,
    clearAll,
    // Kid packs never expire, but the shared hook contract carries
    // expiresAt anyway — leave it null.
    expiresAt: null,
  }
}
