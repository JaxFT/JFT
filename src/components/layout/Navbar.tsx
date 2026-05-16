'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isAdminEmail } from '@/lib/admin'
import { Plane, Menu, X, User, LogOut, ShieldCheck } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const navLinks = [
  { label: 'Home',              href: '/' },
  { label: 'Blog',              href: '/blog' },
  { label: 'Guides',           href: '/guides' },
  { label: 'I Want To Travel', href: '/i-want-to-travel' },
  { label: 'Learning',         href: '/learning' },
]

export default function Navbar() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const isHome = pathname === '/'

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!isHome) return
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [isHome])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const transparent = isHome && !scrolled
  const isAdmin = isAdminEmail(user?.email)

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      transparent ? 'bg-transparent' : 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className={`font-bold text-sm tracking-wide uppercase ${transparent ? 'text-white' : 'text-gray-900'}`}>
              Jax Family Travels
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? transparent ? 'text-white font-semibold' : 'text-brand-600 font-semibold'
                    : transparent ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link href="/admin" className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    transparent ? 'text-brand-200 hover:text-white' : 'text-brand-600 hover:text-brand-700'
                  }`}>
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                <Link href="/account" className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  transparent ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}>
                  <User className="w-4 h-4" />
                  Account
                </Link>
                <button onClick={handleSignOut} className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  transparent ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-gray-700'
                }`}>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className={`text-sm font-medium transition-colors ${
                  transparent ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}>
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary !py-2 !px-4 !text-sm">
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className={`md:hidden p-2 rounded-md ${transparent ? 'text-white' : 'text-gray-700'}`}
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 mt-3">
              {user ? (
                <div className="space-y-1">
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-brand-600">Admin</Link>
                  )}
                  <Link href="/account" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-700">Account</Link>
                  <button onClick={handleSignOut} className="block w-full text-left px-3 py-2 text-sm text-gray-500">Sign out</button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-700">Log in</Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-brand-600">Sign up free</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
