'use client'

import { usePathname } from 'next/navigation'
import { Instagram } from 'lucide-react'
import Logo from '@/components/branding/Logo'

// Plain <a> throughout (not next/link). Same reasoning as the Navbar:
// CSR navigation occasionally rendered the destination page unstyled,
// full reloads eliminate the flash.

export default function Footer() {
  // Kid passport pages should not show the site footer — strangers
  // who scan the QR should only see their own passport.
  const pathname = usePathname()
  if (pathname?.startsWith('/kid/')) return null

  return (
    <footer className="bg-brand-950 text-white/70 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <a href="/" className="inline-flex items-center mb-4">
              <Logo height={36} variant="onDark" ariaLabel="Jax | Family Travels, home" />
            </a>
            <p className="text-sm leading-relaxed max-w-xs mb-4">
              Honest guides, practical tools, and what actually worked for our family.
            </p>
            <a
              href="https://instagram.com/jax.familytravels"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white"
              aria-label="Follow @jax.familytravels on Instagram"
            >
              <Instagram className="w-4 h-4" /> @jax.familytravels
            </a>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wide">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
              <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="/guides" className="hover:text-white transition-colors">Guides</a></li>
              <li><a href="/adventure-packs" className="hover:text-white transition-colors">Adventure Packs</a></li>
              <li><a href="/passports" className="hover:text-white transition-colors">Family Passport</a></li>
              <li><a href="/learning" className="hover:text-white transition-colors">Worldschooling</a></li>
              <li><a href="/work-with-us" className="hover:text-white transition-colors">Work With Us</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wide">More</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://waystaq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Waystaq — trip &amp; expense tracker
                </a>
              </li>
              <li><a href="/login" className="hover:text-white transition-colors">Log in</a></li>
              <li><a href="/signup" className="hover:text-white transition-colors">Sign up</a></li>
              <li><a href="/account" className="hover:text-white transition-colors">My account</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p>© {new Date().getFullYear()} Jax | Family Travels. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
