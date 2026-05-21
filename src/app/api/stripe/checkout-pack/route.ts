// Stripe checkout for a one-off Adventure Pack purchase. Lets a free
// signed-in user buy access to a single country pack at £4.99 (the
// price ID is the single STRIPE_PRICE_ADVENTURE_PACK env var, shared
// across all packs).
//
// Differs from the web-guide checkout in two ways:
//   - sign-in is required, the resulting jax_pack_purchases row keys
//     on auth.uid() and we don't want a post-checkout email-matching
//     dance just to grant pack access
//   - country_slug is the product identifier (validated against
//     PACK_META.slug), not a Stripe price per slug

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripeClient } from '@/lib/stripe'
import { PACK_META } from '@/lib/adventurePackMeta'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  let body: { slug?: string } = {}
  try { body = await request.json() } catch {}
  const slug = typeof body.slug === 'string' ? body.slug.toLowerCase() : null
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  // Reject anything that isn't a real, live country pack. Keeps the
  // checkout URL from being weaponised to mint arbitrary purchase
  // rows for slugs the access check would ignore anyway.
  const meta = PACK_META.find(p => p.slug === slug && p.status === 'live')
  if (!meta) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  }
  if (slug === 'france') {
    return NextResponse.json({ error: 'France is free for signed-in users' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to buy an Adventure Pack.' }, { status: 401 })
  }

  // Skip the checkout if they already own the pack.
  const { data: existing } = await supabase
    .from('jax_pack_purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('country_slug', slug)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'You already own this pack.' }, { status: 409 })
  }

  const priceId = process.env.STRIPE_PRICE_ADVENTURE_PACK
  if (!priceId) {
    return NextResponse.json({ error: 'Adventure pack price not configured (STRIPE_PRICE_ADVENTURE_PACK).' }, { status: 500 })
  }

  const origin = new URL(request.url).origin
  const stripe = stripeClient()

  // client_reference_id + metadata both carry the user_id and slug.
  // The webhook reads metadata (more reliable for non-Payment Link
  // flows); client_reference_id is the user-visible breadcrumb on
  // the Stripe Dashboard side.
  const metadata: Record<string, string> = {
    kind: 'adventure_pack',
    user_id: user.id,
    country_slug: slug,
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/adventure-packs/${slug}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/adventure-packs/${slug}?purchase=cancelled`,
      client_reference_id: user.id,
      ...(user.email ? { customer_email: user.email } : {}),
      metadata,
      payment_intent_data: { metadata },
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
