import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGuideBySlug } from '@/lib/guides-db'
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

  const guide = await getGuideBySlug(slug)
  if (!guide || !guide.active) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
  }

  // Lookup stripe_price_id directly, guides-db doesn't return it
  const { data: priceRow } = await supabase
    .from('products')
    .select('stripe_price_id')
    .eq('id', guide.id)
    .single()
  const priceId = priceRow?.stripe_price_id as string | undefined
  if (!priceId) {
    return NextResponse.json(
      { error: 'This guide is not yet wired up for checkout, missing price.' },
      { status: 500 },
    )
  }

  const origin = new URL(request.url).origin
  const stripe = stripeClient()

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/guides/${slug}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/guides/${slug}?purchase=cancelled`,
      customer_email: user.email ?? undefined,
      // Metadata flows through to the webhook, never trust client-supplied user IDs
      metadata: {
        user_id: user.id,
        product_id: guide.id,
        product_slug: guide.slug,
      },
      // Also stamp on the payment intent so a refund or dispute can be traced back
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          product_id: guide.id,
          product_slug: guide.slug,
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
