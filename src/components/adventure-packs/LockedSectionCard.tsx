// Sign-up banner shown above locked missions when an anonymous visitor
// opens one. The mission content still renders below in a disabled
// (read-only) state so visitors can SEE what they'd unlock — they just
// can't tap inputs, complete missions, or save answers.

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
    <div className="bg-white rounded-2xl border border-brand-200 shadow-sm p-5 sm:p-6 mb-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-50 shrink-0">
          <Lock className="w-5 h-5 text-brand-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
            This mission is locked
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed mt-1">
            Have a look around — sign up free to actually use it and save your
            progress.
          </p>
        </div>
      </div>

      {/* Two-track CTAs. Free account leads (smaller commitment), Premium
          sits beside it in the dark brand pill to signal the bigger value. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`/signup?next=/adventure-packs/${packSlug}`}
          className="btn-primary inline-flex items-center justify-center gap-1.5 !py-2.5 !px-4 !text-sm w-full"
        >
          Sign up free to unlock {country} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          href={`/signup?next=/account&from=premium`}
          className="bg-brand-950 text-white hover:bg-brand-900 font-bold inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-sm transition-colors w-full"
        >
          <Crown className="w-3.5 h-3.5" /> Go Premium for everything
        </Link>
      </div>

      <p className="text-xs text-gray-500 mt-4 leading-relaxed">
        Premium (£49.99/yr) unlocks every one of our 80+ Adventure Packs, the Adventure
        Passport for kids, and every guide + premium blog post.{' '}
        <Link href={`/login?next=/adventure-packs/${packSlug}`} className="font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2">
          Already have an account? Log in.
        </Link>
      </p>

      {/* Small visual hint that what follows is preview-only. */}
      <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mt-5 mb-0 flex items-center gap-2">
        <span className="flex-1 h-px bg-gray-200" />
        Preview only
        <span className="flex-1 h-px bg-gray-200" />
      </p>
    </div>
  )
}
