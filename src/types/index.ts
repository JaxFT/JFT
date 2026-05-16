export type SubscriptionTier = 'free' | 'premium'

export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  subscription_tier: SubscriptionTier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price_pence: number
  stripe_price_id: string | null
  type: 'guide' | 'tool' | 'pack'
  active: boolean
  created_at: string
}

export interface Purchase {
  id: string
  user_id: string
  product_id: string
  stripe_payment_intent_id: string | null
  amount_pence: number
  purchased_at: string
}

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  date: string
  author: string
  coverImage: string
  tags: string[]
  content: string
  readTime: number
}
