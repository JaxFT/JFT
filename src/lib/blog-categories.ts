// Client-safe blog category constants/types. Kept separate from blog-db.ts
// because blog-db.ts pulls in server-only Supabase helpers via next/headers,
// which can't be imported from client components.

export type BlogCategory = 'accommodation' | 'restaurant' | 'bar' | 'activity' | 'general'

export const BLOG_CATEGORIES: { value: BlogCategory; label: string; placePrompt: string }[] = [
  { value: 'accommodation', label: 'Accommodation', placePrompt: 'Where did you stay?' },
  { value: 'restaurant',    label: 'Restaurant',    placePrompt: 'Where did you eat?' },
  { value: 'bar',           label: 'Bar',           placePrompt: 'Which bar?' },
  { value: 'activity',      label: 'Activity or attraction', placePrompt: 'What / where did you visit?' },
  { value: 'general',       label: 'General travel', placePrompt: 'Place name (optional)' },
]

export const VALID_BLOG_CATEGORIES: BlogCategory[] = BLOG_CATEGORIES.map(c => c.value)
