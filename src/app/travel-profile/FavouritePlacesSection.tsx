'use client'

// Favourite restaurants / attractions on the Travel Profile — the
// user's own recommendations, split by category. Same underlying
// /api/recommendations as the /recommendations browse page, just
// filtered to the current user and grouped for display here.

import { useState } from 'react'
import Link from 'next/link'
import { Compass, Plus, UtensilsCrossed } from 'lucide-react'
import RecommendationForm, { type NewRecommendationInput } from '@/components/recommendations/RecommendationForm'
import RecommendationCard from '@/components/recommendations/RecommendationCard'
import type { Recommendation, RecommendationCategory } from '@/components/recommendations/types'

export default function FavouritePlacesSection({
  initialRecommendations,
}: {
  initialRecommendations: Recommendation[]
}) {
  const [recommendations, setRecommendations] = useState(initialRecommendations)
  const [addingCategory, setAddingCategory] = useState<RecommendationCategory | null>(null)
  const [error, setError] = useState('')

  const addRecommendation = async (input: NewRecommendationInput): Promise<string | void> => {
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return body.error || 'Could not add that place'
      setRecommendations(prev => [body.recommendation, ...prev])
      setAddingCategory(null)
    } catch {
      return 'Could not add that place'
    }
  }

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

  return (
    <>
      <CategorySection
        title="Favourite restaurants"
        icon={<UtensilsCrossed className="w-5 h-5 text-brand-600" />}
        category="food"
        recommendations={recommendations.filter(r => r.category === 'food')}
        adding={addingCategory === 'food'}
        onAddClick={() => setAddingCategory('food')}
        onCancelAdd={() => setAddingCategory(null)}
        onSubmit={addRecommendation}
        onRemove={removeRecommendation}
      />
      <CategorySection
        title="Favourite attractions"
        icon={<Compass className="w-5 h-5 text-brand-600" />}
        category="attraction"
        recommendations={recommendations.filter(r => r.category === 'attraction')}
        adding={addingCategory === 'attraction'}
        onAddClick={() => setAddingCategory('attraction')}
        onCancelAdd={() => setAddingCategory(null)}
        onSubmit={addRecommendation}
        onRemove={removeRecommendation}
      />
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}
    </>
  )
}

function CategorySection({
  title, icon, category, recommendations, adding, onAddClick, onCancelAdd, onSubmit, onRemove,
}: {
  title: string
  icon: React.ReactNode
  category: RecommendationCategory
  recommendations: Recommendation[]
  adding: boolean
  onAddClick: () => void
  onCancelAdd: () => void
  onSubmit: (input: NewRecommendationInput) => Promise<string | void>
  onRemove: (id: string) => void
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        <Link href="/recommendations" className="text-xs font-semibold text-gray-400 hover:text-brand-700">
          Browse all
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">Places you&apos;ve actually been, rated out of 5.</p>

      {recommendations.length > 0 && (
        <div className="space-y-2 mb-4">
          {recommendations.map(r => (
            <RecommendationCard key={r.id} rec={r} canEdit onRemove={onRemove} />
          ))}
        </div>
      )}

      {adding ? (
        <RecommendationForm lockCategory={category} onSubmit={onSubmit} onCancel={onCancelAdd} />
      ) : (
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          <Plus className="w-4 h-4" /> Add a place
        </button>
      )}
    </section>
  )
}
