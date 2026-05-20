// Stripe checkout for downloadable web-guide offline copies.
//
// Mirrors /api/stripe/checkout (which handles legacy PDF guides via
// the products table) but reads the price ID from the guides table
// and stamps a `kind: 'web_guide'` metadata flag so the webhook
// writes into web_guide_purchases rather than the legacy purchases
// ledger.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPublishedWebGuideBySlug } from '@/lib/guides-content-db'
import { stripeClient } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  let body: { slug?: string } = {}
  try { body = await request.json() } catch {}
  const slug = typeof body.slug === 'string' ? body.slug : null
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Please sign in to buy this guide.', signInUrl: `/login?next=/guides/${slug}` },
      { status: 401 },
    )
  }

  const guide = await getPublishedWebGuideBySlug(slug)
  if (!guide) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
  }
  if (!guide.stripe_price_id) {
    return NextResponse.json(
      { error: 'This guide is not yet wired up for download — missing Stripe price.' },
      { status: 500 },
    )
  }

  const origin = new URL(request.url).origin
  const stripe = stripeClient()

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: guide.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/guides/${slug}?download=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/guides/${slug}?download=cancelled`,
      customer_email: user.email ?? undefined,
      // Metadata flows through to the webhook. The `kind` flag tells
      // the webhook to write into web_guide_purchases rather than the
      // legacy purchases table.
      metadata: {
        kind: 'web_guide',
        user_id: user.id,
        guide_id: guide.id,
        guide_slug: guide.slug,
      },
      payment_intent_data: {
        metadata: {
          kind: 'web_guide',
          user_id: user.id,
          guide_id: guide.id,
          guide_slug: guide.slug,
        },
      },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
    }
    return NextResponse.json({ url: session.url })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Stripe error' },
      { status: 500 },
    )
  }
}
