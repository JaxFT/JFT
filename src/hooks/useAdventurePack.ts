// Single source of truth for Adventure Pack client state.
//
// - Loads session + per-section answers from Supabase on mount.
// - Exposes updateAnswer(section, key, value) which debounces a save
//   per section (1 s) so typing into a textarea doesn't hammer the DB.
// - Exposes completeMission / changeAgeMode which save immediately.
// - clearAll wipes the row server-side then resets local state.

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadPack, saveSection, saveSession, clearPack,
} from '@/lib/adventurePackSave'
import type {
  AgeMode, SectionAnswers, SectionKey,
} from '@/lib/adventurePackTypes'

export type UseAdventurePackResult = {
  loading: boolean
  ageMode: AgeMode
  changeAgeMode: (m: AgeMode) => void
  missionsComplete: string[]
  completeMission: (m: SectionKey) => void
  isMissionComplete: (m: SectionKey) => boolean
  answers: Record<string, SectionAnswers>
  getAnswer: <T = unknown>(section: SectionKey, key: string, fallback: T) => T
  updateAnswer: (section: SectionKey, key: string, value: unknown) => void
  clearAll: () => Promise<void>
  expiresAt: string | null
}

const SAVE_DEBOUNCE_MS = 1000

// Sticky cross-pack age-mode preference. Stored only in this browser,
// so it survives between packs without needing a profile-level setting.
// Per-pack saved sessions always win over this fallback.
const AGE_MODE_PREF_KEY = 'jft.adventure-pack.ageMode'

function readAgeModePref(): AgeMode | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(AGE_MODE_PREF_KEY)
    return v === 'older' || v === 'younger' ? v : null
  } catch {
    return null
  }
}

function writeAgeModePref(mode: AgeMode) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AGE_MODE_PREF_KEY, mode)
  } catch {
    // private mode or storage disabled; nothing to do
  }
}

export function useAdventurePack(
  userId: string,
  countrySlug: string,
): UseAdventurePackResult {
  const [ageMode, setAgeMode] = useState<AgeMode>('younger')
  const [missionsComplete, setMissionsComplete] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, SectionAnswers>>({})
  const [loading, setLoading] = useState(true)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  // Per-section debounced save timers. We coalesce rapid typing into one
  // network call per section.
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Keep the latest snapshot per section so the debounced save flush
  // writes the most recent state even if React state has changed since
  // the timer was set.
  const latestAnswers = useRef<Record<string, SectionAnswers>>({})

  useEffect(() => {
    let mounted = true
    loadPack(userId, countrySlug).then(loaded => {
      if (!mounted) return
      // First time opening this pack: defer to the user's last-used age
      // mode across packs (localStorage), if any. Packs with an existing
      // session keep their own saved mode.
      const initialMode = loaded.hasSession
        ? loaded.ageMode
        : (readAgeModePref() ?? loaded.ageMode)
      setAgeMode(initialMode)
      setMissionsComplete(loaded.missionsComplete)
      setAnswers(loaded.answersBySection)
      latestAnswers.current = loaded.answersBySection
      setExpiresAt(loaded.expiresAt)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [userId, countrySlug])

  // Flush in-flight timers on unmount so partial typing isn't lost.
  useEffect(() => {
    const timers = saveTimers.current
    return () => {
      for (const t of Object.values(timers)) clearTimeout(t)
    }
  }, [])

  const updateAnswer = useCallback((section: SectionKey, key: string, value: unknown) => {
    setAnswers(prev => {
      const sectionAns: SectionAnswers = { ...(prev[section] ?? {}), [key]: value }
      const next = { ...prev, [section]: sectionAns }
      latestAnswers.current = next

      if (saveTimers.current[section]) clearTimeout(saveTimers.current[section])
      saveTimers.current[section] = setTimeout(() => {
        const snapshot = latestAnswers.current[section] ?? {}
        saveSection(userId, countrySlug, section, snapshot).catch(() => null)
      }, SAVE_DEBOUNCE_MS)

      return next
    })
  }, [userId, countrySlug])

  const getAnswer = useCallback(<T,>(section: SectionKey, key: string, fallback: T): T => {
    const v = answers[section]?.[key]
    return (v === undefined ? fallback : (v as T))
  }, [answers])

  const completeMission = useCallback((mission: SectionKey) => {
    setMissionsComplete(prev => {
      if (prev.includes(mission)) return prev
      const next = [...prev, mission]
      saveSession(userId, countrySlug, ageMode, next)
        .then(exp => exp && setExpiresAt(exp))
        .catch(() => null)
      return next
    })
  }, [userId, countrySlug, ageMode])

  const isMissionComplete = useCallback(
    (mission: SectionKey) => missionsComplete.includes(mission),
    [missionsComplete],
  )

  const changeAgeMode = useCallback((mode: AgeMode) => {
    setAgeMode(mode)
    writeAgeModePref(mode)
    saveSession(userId, countrySlug, mode, missionsComplete)
      .then(exp => exp && setExpiresAt(exp))
      .catch(() => null)
  }, [userId, countrySlug, missionsComplete])

  const clearAll = useCallback(async () => {
    // Cancel any pending debounced writes BEFORE delete so they don't
    // race and re-create rows after the wipe.
    for (const t of Object.values(saveTimers.current)) clearTimeout(t)
    saveTimers.current = {}
    await clearPack(userId, countrySlug)
    latestAnswers.current = {}
    setAnswers({})
    setMissionsComplete([])
    setAgeMode('younger')
    setExpiresAt(null)
  }, [userId, countrySlug])

  return {
    loading,
    ageMode, changeAgeMode,
    missionsComplete, completeMission, isMissionComplete,
    answers, getAnswer, updateAnswer,
    clearAll,
    expiresAt,
  }
}
