'use client'

// Listens for the `jft.family-way.completed` postMessage that the iframe
// fires when a visitor reaches the results screen, and POSTs an anonymous
// completion to the server so the admin dashboard can count it. Renders
// nothing; lives next to the iframe in the page so the listener is
// attached for the lifetime of the questionnaire view.
//
// The iframe is rendered via srcDoc, so its document has a null origin
// and can't fetch our API directly without CORS gymnastics. postMessage
// to the parent, then the parent fetches with its real origin, is the
// straightforward way through.

import { useEffect } from 'react'

export default function FamilyWayCompletionTracker() {
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // srcDoc iframes report a null origin; just match on the payload
      // shape rather than the origin string.
      const data = e.data
      if (!data || typeof data !== 'object') return
      if (data.type !== 'jft.family-way.completed') return
      const score = typeof data.score === 'number' ? data.score : null
      fetch('/api/family-way/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
        keepalive: true,
      }).catch(() => {})
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
  return null
}
