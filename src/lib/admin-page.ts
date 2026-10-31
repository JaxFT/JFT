import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

// Call first in every admin page, before loading anything. The check in
// app/admin/layout.tsx isn't enough on its own: Next renders a layout and
// its page at the same time, so a page's data (fetched with the service
// role) was still sent to logged-out visitors under the 404. Found
// 2026-10-31 leaking admin emails and a live discount code.
export async function requireAdminPage(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) notFound()
}
