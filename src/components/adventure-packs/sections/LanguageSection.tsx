'use client'

import { useState } from 'react'
import { Volume2, Check } from 'lucide-react'
import type { AdventurePackData, Phrase } from '@/lib/adventurePackTypes'
import type { PackHook } from '../PackShell'
import PhotoPrompt from '../PhotoPrompt'

// Native speech-synth lookup. Picks a voice matching the BCP-47 lang
// tag if the browser has one; otherwise falls back to reading the
// phonetic spelling (which at least sounds plausible).
function speakPhrase(phrase: Phrase) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const trigger = () => {
    speechSynthesis.cancel()
    const voices = speechSynthesis.getVoices()
    const match = voices.find(v => v.lang.startsWith(phrase.lang))
    const u = new SpeechSynthesisUtterance()
    u.rate = 0.75
    u.pitch = 1
    if (match) {
      u.voice = match
      u.lang = phrase.lang
      u.text = phrase.nativeScript
    } else {
      u.text = phrase.phonetic
    }
    speechSynthesis.speak(u)
  }
  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.onvoiceschanged = trigger
  } else {
    trigger()
  }
}

export default function LanguageSection({ data, pack }: { data: AdventurePackData; pack: PackHook }) {
  const visible = data.phrases.filter(p => pack.ageMode === 'older' || !p.olderOnly)
  const [usedMap, setUsedMap] = useState<Record<string, boolean>>(() => {
    const saved = pack.answers['language'] ?? {}
    const out: Record<string, boolean> = {}
    Object.entries(saved).forEach(([k, v]) => { if (k.startsWith('used-')) out[k.slice('used-'.length)] = Boolean(v) })
    return out
  })

  const toggleUsed = (english: string) => {
    const next = !usedMap[english]
    setUsedMap(m => ({ ...m, [english]: next }))
    pack.updateAnswer('language', `used-${english}`, next)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        Try one with someone today. Even just one is brave. Tap <em>Hear it</em> to listen, then mark <em>I used it</em> when you do.
      </p>
      <ul className="space-y-2">
        {visible.map(p => {
          const used = !!usedMap[p.english]
          return (
            <li key={p.english} className="bg-sand-50 border border-gray-100 rounded-lg px-4 py-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-base">{p.english}</p>
                  <p className="text-lg font-medium text-brand-800 mt-0.5">{p.nativeScript}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{p.nativeLatin}</p>
                  <p className="text-xs italic text-gray-500 mt-0.5">{p.phonetic}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => speakPhrase(p)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-md"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Hear it
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleUsed(p.english)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md ${
                      used ? 'bg-brand-100 text-brand-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {used ? 'Used it' : 'I used it!'}
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <PhotoPrompt prompt={`A photo of a sign, menu, or shop in ${data.country} written in the local script. See how much you can recognise.`} />
    </div>
  )
}
