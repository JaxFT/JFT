import { readWaystaqDiscount } from '@/lib/waystaq-discount'
import SignupForm from './SignupForm'

// Server component: resolves the WayStaq discount cookie so the Premium
// option can show the £25 member price, and reads ?plan=premium so the
// "Get Premium" CTA lands with Premium pre-selected. Reading cookies makes
// this route dynamic, which is what we want, the price must reflect the
// live cookie.
export const dynamic = 'force-dynamic'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const [discount, { plan }] = await Promise.all([readWaystaqDiscount(), searchParams])
  return (
    <SignupForm
      discountEmail={discount?.email ?? null}
      defaultTier={plan === 'premium' ? 'premium' : 'free'}
    />
  )
}
