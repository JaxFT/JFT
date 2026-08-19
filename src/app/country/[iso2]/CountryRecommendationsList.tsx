'use client'

// Same delete-with-local-state pattern as RecommendationsBrowser, kept
// separate rather than reusing that component directly — this page
// doesn't need its filter bar (the country is already fixed by the
// route) or the add-a-place form (that stays on /recommendations,
// linked below the list).

import { useState } from 'react'
import RecommendationCard from '@/components/recommendations/RecommendationCard'
import type { Recommendation } from '@/components/recommendations/types'

export default function CountryRecommendationsList({
  initialRecommendations,
  currentUserId,
  isAdmin,
}: {
  initialRecommendations: Recommendation[]
  currentUserId: string | null
  isAdmin: boolean
}) {
  const [recommendations, setRecommendations] = useState(initialRecommendations)
  const [error, setError] = useState('')

  const removeRecommendation = async (id: string) => {
    setError('')
    const prev = recommendations
    setRecommendations(list => list.filter(r => r.id !== id))
    const res = await fetch(`/api/recommendations?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setRecommendations(prev)
      setError('Could not remove that place')
    }
  }

  if (recommendations.length === 0) return null

  return (
    <div className="space-y-2 mb-3">
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}
      {recommendations.map(r => (
        <RecommendationCard
          key={r.id}
          rec={r}
          showAuthor
          canInteract={!!currentUserId}
          canEdit={r.user_id === currentUserId}
          onRemove={(r.user_id === currentUserId || isAdmin) ? removeRecommendation : undefined}
        />
      ))}
    </div>
  )
}
