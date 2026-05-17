import { createClient } from '@/lib/supabase/server'

export async function getSetting(key: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  return (data?.value as string | undefined) ?? null
}

export async function getAboutUs(): Promise<string> {
  return (await getSetting('about_us')) ?? ''
}
