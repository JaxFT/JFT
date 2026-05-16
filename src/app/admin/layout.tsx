import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!isAdminEmail(user?.email)) {
    notFound()
  }

  return <>{children}</>
}
