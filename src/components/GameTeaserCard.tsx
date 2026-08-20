import Link from 'next/link'
import { Gamepad2, ArrowRight } from 'lucide-react'

// Cross-links the free browser game from both /adventure-packs and
// /passports — the game itself needs no account and no purchase, so
// this card never gates on premium/signed-in state.
export default function GameTeaserCard() {
  return (
    <Link
      href="/adventure-game"
      className="group flex items-center justify-between gap-4 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-sand-50 px-5 py-4 mb-8 hover:border-brand-400 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center">
          <Gamepad2 className="w-5 h-5" />
        </span>
        <div>
          <p className="font-bold text-gray-900">Play: Get the Family There! 🇯🇵🇰🇷🇹🇭🇻🇳</p>
          <p className="text-sm text-gray-500">Free one-thumb browser game — fire travellers through multiplier gates and see how many make it.</p>
        </div>
      </div>
      <ArrowRight className="w-5 h-5 text-brand-600 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
    </Link>
  )
}
