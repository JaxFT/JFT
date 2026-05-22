import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidCountryIso2 } from '@/lib/countries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// PATCH /api/family/home-country
// Body: { home_country_iso2: string | null }
// Sets the parent profile's home country. Applies family-wide:
// every child in the family inherits this for milestone-exclusion
// and map-zoom purposes.
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
  }

  let body: { home_country_iso2?: string | null } = {}
  try { body = await request.json() } catch {}

  let iso2: string | null = null
  if (body.home_country_iso2 === null || body.home_country_iso2 === '') {
    iso2 = null
  } else if (typeof body.home_country_iso2 === 'string') {
    if (!isValidCountryIso2(body.home_country_iso2)) {
      return NextResponse.json({ error: 'Unknown home country.' }, { status: 400 })
    }
    iso2 = body.home_country_iso2.toLowerCase()
  } else {
    return NextResponse.json({ error: 'Missing home_country_iso2.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ home_country_iso2: iso2 })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
