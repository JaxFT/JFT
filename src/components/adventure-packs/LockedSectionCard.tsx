// Renders in place of a pack section when an anonymous visitor opens
// a mission that's locked behind sign-up. Soft sell: free account
// unlocks the rest of THIS pack; Premium unlocks everything site-wide.

import Link from 'next/link'
import { Lock, Crown, Check, ArrowRight } from 'lucide-react'

export default function LockedSectionCard({
  country,
  packSlug,
}: {
  country: string
  packSlug: string
}) {
  return (
    <div className="space-y-4">
      {/* Free-account CTA — the lighter, less committing option, leads. */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 mb-4">
          <Lock className="w-6 h-6 text-brand-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Sign up free to see the rest
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-5 max-w-md mx-auto">
          You&apos;re using the free taster of the {country} pack. Create an account to
          unlock every mission in this pack, with your progress saved across phones,
          tablets and visits.
        </p>
        <Link
          href={`/signup?next=/adventure-packs/${packSlug}`}
          className="btn-primary inline-flex items-center gap-1.5 !py-2.5 !px-5 !text-sm"
        >
          Create a free account <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-gray-400 mt-4">
          Already have an account?{' '}
          <Link href={`/login?next=/adventure-packs/${packSlug}`} className="font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2">
            Log in
          </Link>
        </p>
      </div>

      {/* Premium upsell — bigger ambition, the dark card to signal value. */}
      <div className="bg-brand-950 text-white rounded-2xl p-6">
        <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-2 inline-flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5" /> Or go Premium for everything
        </p>
        <h3 className="text-xl font-bold mb-3 leading-tight">
          £49.99 a year for the whole site.
        </h3>
        <ul className="space-y-1.5 text-sm text-white/85 mb-5">
          {[
            'Every one of our 80+ Adventure Packs, in every country we cover',
            'Adventure Passports for every child, with stamps as they complete missions',
            'Every guide and every premium blog post',
          ].map(line => (
            <li key={line} className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-brand-300 mt-1 shrink-0" strokeWidth={3} />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <Link
          href={`/signup?next=/account&from=premium`}
          className="bg-white text-brand-900 hover:bg-gray-100 font-bold inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md text-sm"
        >
          <Crown className="w-4 h-4" /> Go Premium
        </Link>
      </div>
    </div>
  )
}
