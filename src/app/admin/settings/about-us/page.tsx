import Link from 'next/link'
import { ShieldCheck, Users } from 'lucide-react'
import type { Metadata } from 'next'
import { getAboutUs } from '@/lib/app-settings'
import AboutForm from './AboutForm'

export const metadata: Metadata = {
  title: 'Admin · About Us',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminAboutUsPage() {
  const value = await getAboutUs()

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <Link href="/admin" className="text-xs font-bold tracking-widest uppercase text-brand-600 hover:underline">Admin</Link>
          <span className="text-xs text-gray-400">/</span>
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500">About Us</p>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <Users className="w-7 h-7 text-brand-600" />
          <h1 className="text-3xl font-bold text-gray-900">About Us text</h1>
        </div>
        <p className="text-gray-500 mb-8 leading-relaxed">
          This text is automatically included on every new web guide as the "About us" page. Update it once here and it changes everywhere.
        </p>

        <AboutForm initialValue={value} />
      </div>
    </div>
  )
}
