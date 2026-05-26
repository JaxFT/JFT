import Link from 'next/link'
import { Crown } from 'lucide-react'
import { readWaystaqDiscount } from '@/lib/waystaq-discount'
import { getCurrentUser } from '@/lib/auth'

// Slim promo bar shown while a WayStaq member's £25 discount cookie is
// live. Pinned to the bottom of the viewport: the top is taken by the
// fixed Navbar, and inner pages hard-code their top offset to it, so a
// top bar would fight that. Server component, it reads the signed cookie
// and renders nothing when there's no active discount.
export default async function WaystaqDiscountBanner() {
  const discount = await readWaystaqDiscount()
  if (!discount) return null

  // The £25 is tied to the verified WayStaq email. If someone is logged
  // into a JFT account whose email doesn't match, the discount won't apply
  // at checkout, so don't dangle it, hide the banner. Logged-out visitors
  // still see it; signup pre-fills the matching email.
  const user = await getCurrentUser()
  if (user && user.email?.toLowerCase() !== discount.email.toLowerCase()) return null

  // Logged-in (matching) users go straight to checkout via /upgrade; new
  // visitors go to signup with Premium pre-selected, which auto-launches
  // checkout after email confirmation. Either way it's one joined flow.
  const href = user ? '/upgrade' : '/signup?plan=premium'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 print:hidden">
      <div
        className="text-white shadow-[0_-4px_20px_rgba(0,0,0,0.18)]"
        style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2d8163 100%)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Crown className="w-4 h-4 shrink-0" />
            <span>
              <span className="font-semibold">WayStaq member perk:</span>{' '}
              JFT Premium for <span className="font-bold">£25</span>
              <span className="line-through text-white/60 ml-1.5">£49.99</span> a year.
            </span>
          </span>
          <Link
            href={href}
            className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-bold text-brand-700 hover:bg-white/90 transition-colors"
          >
            Get Premium
          </Link>
        </div>
      </div>
    </div>
  )
}
