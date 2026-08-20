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
import { Menu, X, User, LogOut, ShieldCheck, ChevronDown } from 'lucide-react'
import Logo from '@/components/branding/Logo'
import NotificationBell from './NotificationBell'

type NavLink = { label: string; href: string; children?: { label: string; href: string }[] }

// Logo handles Home. How We Can Help is a right-side CTA button, not
// part of this list. URLs stay the same so existing links + SEO
// don't break, only the visible labels change. Grouped entries (with
// `children`) collapse several pages under one top-level slot — hover
// reveals a small dropdown on desktop, the mobile menu just lists the
// children indented underneath, no accordion needed for two items.
const navLinks: NavLink[] = [
  { label: 'About', href: '/about' },
  {
    label: 'Blog & Guides', href: '/blog',
    children: [
      { label: 'Blog', href: '/blog' },
      { label: 'Guides', href: '/guides' },
    ],
  },
  {
    label: 'How We Can Help', href: '/work-with-us',
    children: [
      { label: 'Pre-trip questionnaire', href: '/work-with-us#questionnaire' },
      { label: 'Our spending',           href: '/asia-adventures' },
      { label: 'Book a 1:1 call',        href: '/work-with-us#call' },
      { label: 'Collaboration',          href: '/work-with-us#collaboration' },
      { label: 'AI Prompts',             href: '/ai-travel-prompts' },
    ],
  },
  {
    label: 'Adventure', href: '/adventure-packs',
    children: [
      { label: 'Adventure Packs', href: '/adventure-packs' },
      { label: 'Adventure Passport', href: '/passports' },
      { label: 'Adventure Game', href: '/adventure-game' },
    ],
  },
  {
    label: 'Community', href: '/recommendations',
    children: [
      { label: 'Worldschooling', href: '/learning' },
      { label: 'Recommendations', href: '/recommendations' },
    ],
  },
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
            {navLinks.map(link => {
              const isActive = pathname === link.href || (link.children?.some(c => c.href === pathname) ?? false)
              return (
                <div key={link.href} className="relative group">
                  <a
                    href={link.href}
                    className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? transparent ? 'text-white font-semibold' : 'text-brand-600 font-semibold'
                        : transparent ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                    {link.children && <ChevronDown className="w-3 h-3 opacity-60" />}
                  </a>
                  {link.children && (
                    <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-50">
                      <div className="bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-[210px]">
                        {link.children.map(child => (
                          <a
                            key={child.href}
                            href={child.href}
                            className={`block px-3.5 py-2 text-sm whitespace-nowrap transition-colors ${
                              pathname === child.href ? 'text-brand-600 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-brand-600'
                            }`}
                          >
                            {child.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right side: auth controls. "How We Can Help" now sits
              inline with the other nav links rather than as a loud CTA. */}
          <div className="hidden md:flex items-center gap-3">
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

          {/* Notification bell — always visible (not tucked behind the
              hamburger on mobile), checking notifications is a quick,
              frequent action people expect one-tap access to. */}
          {user && <NotificationBell transparent={transparent} />}

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
              <div key={link.href}>
                <a
                  href={link.href}
                  className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {link.label}
                </a>
                {link.children && (
                  <div className="pl-3 border-l border-gray-100 ml-3">
                    {link.children.map(child => (
                      <a
                        key={child.href}
                        href={child.href}
                        className="block px-3 py-1.5 rounded-md text-xs text-gray-500 hover:bg-gray-50 hover:text-brand-600"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
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
