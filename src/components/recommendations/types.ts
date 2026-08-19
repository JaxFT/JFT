// Shared shape for a recommendation row, as returned by
// /api/recommendations (GET/POST). Kept separate from the DB row so
// the API can attach the resolved author display name without
// coupling every consumer to travel-profile-db's PublicProfile type.

export type RecommendationCategory = 'food' | 'attraction'

export type Recommendation = {
  id: string
  user_id: string
  category: RecommendationCategory
  place_name: string
  iso2: string
  town: string
  google_maps_url: string | null
  date_visited: string | null
  rating: number
  note: string | null
  created_at: string
  author: { id: string; username: string | null; full_name: string | null } | null
  up_votes: number
  down_votes: number
  my_vote: 1 | -1 | null
  comment_count: number
  blog_link: { slug: string; title: string } | null
}

export type RecommendationComment = {
  id: string
  user_id: string
  body: string
  created_at: string
  author: { id: string; username: string | null; full_name: string | null } | null
}
