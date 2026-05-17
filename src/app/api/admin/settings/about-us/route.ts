import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { ok: false as const, supabase, user: null }
  return { ok: true as const, supabase, user }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })
  const { data, error } = await auth.supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'about_us')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ value: (data?.value as string | undefined) ?? '' })
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 404 })

  const body = (await request.json().catch(() => null)) as { value?: string } | null
  if (!body || typeof body.value !== 'string') {
    return NextResponse.json({ error: 'Missing `value` string' }, { status: 400 })
  }

  // Upsert
  const { error } = await auth.supabase
    .from('app_settings')
    .upsert({ key: 'about_us', value: body.value, updated_by: auth.user.id }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
