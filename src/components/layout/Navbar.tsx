'use client'

// Top navigation. Uses plain <a> tags (not next/link) so every click
// triggers a full page reload. This eliminates a CSR-only FOUC bug
// where the new page would render unstyled for a moment until the
// stylesheet caught up, then a refresh fixed it. The ~300 ms extra
// per navigation is worth a zero-flash transition.

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isAdminEmail } from '@/lib/admin'
import { Menu, X, User, LogOut, ShieldCheck } from 'lucide-react'
import Logo from '@/components/branding/Logo'

// Logo handles Home. Work With Us is a right-side CTA button, not
// part of this list. Names are the ones a visitor would search for —
// "Family Passport" instead of just "Passports" (which is ambiguous
// in a travel context), "Worldschooling" instead of the corporate
// "Learning Resources". URLs stay the same so existing links + SEO
// don't break.
const navLinks = [
  { label: 'About',            href: '/about' },
  { label: 'Blog',             href: '/blog' },
  { label: 'Guides',           href: '/guides' },
  { label: 'Adventure Packs',  href: '/adventure-packs' },
  { label: 'Family Passport',  href: '/passports' },
  { label: 'Worldschooling',   href: '/learning' },
]

// Tiny shape, id + email is everything Navbar needs.
type NavUser = { id: string; email: string | null } | null

type Props = {
  initialUserId: string | null
  initialUserEmail: string | null
}

export default function Navbar({ initialUserId, initialUserEmail }: Props) {
  // Seed with the user resolved server-side so the first paint already
  // shows the correct logged-in state (no post-mount flicker).
  const [user, setUser] = useState<NavUser>(
    initialUserId ? { id: initialUserId, email: initialUserEmail } : null,
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  // Memoise so the client isn't reconstructed on every render.
  const supabase = useMemo(() => createClient(), [])

  const isHome = pathname === '/'
  // Kid passport pages run in an isolated chrome — when someone scans
  // a child's QR code we don't want them able to navigate out into the
  // rest of the site.
  const isKidRoute = pathname?.startsWith('/kid/') ?? false

  useEffect(() => {
    // Subscribe to auth changes so the Navbar updates when the user signs
    // in / out without a full page refresh. We do NOT re-fetch the user
    // here, it's already in state from the server render above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user
      setUser(u ? { id: u.id, email: u.email ?? null } : null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

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

  if (isKidRoute) return null

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 print:hidden ${
      transparent ? 'bg-transparent' : 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo + wordmark side by side */}
          <a href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <Logo
              height={36}
              variant={transparent ? 'onDark' : 'gradient'}
              ariaLabel="Jax | Family Travels, home"
            />
            {/* Wordmark sits next to the logo on every screen size.
                On phones it shrinks slightly to leave room for the
                burger button on the right. */}
            <span className={`font-bold text-[11px] sm:text-sm tracking-wide uppercase whitespace-nowrap ${transparent ? 'text-white' : 'text-gray-900'}`}>
              Jax <span className="opacity-50 font-light mx-0.5">|</span> Family Travels
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? transparent ? 'text-white font-semibold' : 'text-brand-600 font-semibold'
                    : transparent ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right side: Work With Us CTA + auth. The CTA gets the
              loud button styling so the visitor's eye lands on the
              conversion action and not a regular nav link. */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="/work-with-us"
              className={`text-sm font-bold rounded-md transition-colors px-3.5 py-2 ${
                transparent
                  ? 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              Work With Us
            </a>
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <a href="/admin" className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    transparent ? 'text-brand-200 hover:text-white' : 'text-brand-600 hover:text-brand-700'
                  }`}>
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </a>
                )}
                <a href="/account" className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  transparent ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}>
                  <User className="w-4 h-4" />
                  Account
                </a>
                <button onClick={handleSignOut} className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  transparent ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-gray-700'
                }`}>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a href="/login" className={`text-sm font-medium transition-colors ${
                  transparent ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}>
                  Log in
                </a>
                <a href="/signup" className={`text-sm font-medium transition-colors ${
                  transparent ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}>
                  Sign up
                </a>
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
            {/* Work With Us pinned at the top as a CTA button — it's
                the highest-value conversion on the site. */}
            <a
              href="/work-with-us"
              className="block px-3 py-2.5 rounded-md text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 text-center mb-2"
            >
              Work With Us
            </a>
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-gray-100 mt-3">
              {user ? (
                <div className="space-y-1">
                  {isAdmin && (
                    <a href="/admin" className="block px-3 py-2 text-sm font-semibold text-brand-600">Admin</a>
                  )}
                  <a href="/account" className="block px-3 py-2 text-sm text-gray-700">Account</a>
                  <button onClick={handleSignOut} className="block w-full text-left px-3 py-2 text-sm text-gray-500">Sign out</button>
                </div>
              ) : (
                <div className="space-y-1">
                  <a href="/login" className="block px-3 py-2 text-sm text-gray-700">Log in</a>
                  <a href="/signup" className="block px-3 py-2 text-sm font-semibold text-brand-600">Sign up free</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
