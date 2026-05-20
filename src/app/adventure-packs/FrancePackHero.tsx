// Marquee block for the free France Adventure Pack on /adventure-packs.
// France is the "try us out" pack, so it gets full visual real estate
// at the top of the page — outside the continent cascade with the 34
// premium packs.
//
// Snippets below are hard-coded from France's actual pack content
// rather than imported from adventurePackData.ts so we don't drag the
// 4000-line content blob into the listing-page Worker bundle.

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { SECTION_KEYS, SECTION_LABELS, SECTION_EMOJI } from '@/lib/adventurePackTypes'
import FlagBanner from '@/components/adventure-packs/FlagBanner'

type Props = {
  signedIn: boolean
}

// A few sample missions from France's actual pack, hard-coded for the
// hero so the marketing page gives a real taste of what's inside.
const PREVIEW_STORY = {
  emoji: '📖',
  label: 'Story',
  title: 'Why does the Eiffel Tower exist?',
  body: 'Built for the 1889 World Fair, the tower was only meant to stand for 20 years before being torn down. Most Parisians hated it. Then it turned out to be a useful radio antenna…',
}

const PREVIEW_PHRASE = {
  emoji: '🗣️',
  label: 'Language',
  english: 'Delicious!',
  french: "C'est délicieux !",
  phonetic: 'say day-lee-syuh',
}

const PREVIEW_FOOD = {
  emoji: '🥐',
  label: 'Food',
  name: 'Croissant',
  description: 'Flaky, buttery breakfast pastry, best fresh from a boulangerie before 10am.',
}

export default function FrancePackHero({ signedIn }: Props) {
  const ctaHref = signedIn ? '/adventure-packs/france' : '/signup?next=/adventure-packs/france'
  const ctaLabel = signedIn ? 'Open the France pack' : 'Create a free account to start'

  return (
    <section className="mb-12 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* TOP BAR — flag, country, free badge, intro copy + CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-0">
        <div className="bg-brand-900 relative">
          <FlagBanner
            iso2="fr"
            country="France"
            fallbackColour="bg-brand-900"
            size="lg"
            rounded={false}
            as="h2"
            className="h-full"
          />
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-xs font-bold bg-white text-brand-700 px-3 py-1.5 rounded-full shadow-sm uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> Free pack
          </span>
        </div>

        <div className="p-6 sm:p-8 flex flex-col justify-center">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-2">Try us out</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">
            Start with France
          </h2>
          <p className="text-gray-600 leading-relaxed text-sm sm:text-base mb-5">
            Our free pack — the same shape as the other 34 country packs.{' '}
            <strong>10 missions</strong> for families exploring France together: language, food,
            history, geography, scavenger hunts, animal spotting, and conversation cards for the
            drive home.
          </p>
          <Link
            href={ctaHref}
            className="btn-primary inline-flex items-center gap-1.5 self-start !py-2.5 !px-5 !text-sm"
          >
            {ctaLabel} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* PREVIEW CARDS — three real samples from the France pack */}
      <div className="px-6 sm:px-8 py-6 bg-sand-50 border-t border-gray-100">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-4">A taste of what&apos;s inside</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Story preview */}
          <article className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-brand-600 mb-2">
              <span className="text-base leading-none" aria-hidden>{PREVIEW_STORY.emoji}</span>
              {PREVIEW_STORY.label}
            </div>
            <h3 className="font-bold text-gray-900 mb-1.5 leading-tight text-sm">{PREVIEW_STORY.title}</h3>
            <p className="text-xs text-gray-600 leading-snug">{PREVIEW_STORY.body}</p>
          </article>

          {/* Phrase preview */}
          <article className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-brand-600 mb-2">
              <span className="text-base leading-none" aria-hidden>{PREVIEW_PHRASE.emoji}</span>
              {PREVIEW_PHRASE.label}
            </div>
            <p className="text-xs text-gray-500 mb-1">{PREVIEW_PHRASE.english}</p>
            <p className="text-xl font-bold text-gray-900 mb-1">{PREVIEW_PHRASE.french}</p>
            <p className="text-xs text-gray-500 italic">[{PREVIEW_PHRASE.phonetic}]</p>
          </article>

          {/* Food preview */}
          <article className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-brand-600 mb-2">
              <span className="text-base leading-none" aria-hidden>{PREVIEW_FOOD.emoji}</span>
              {PREVIEW_FOOD.label}
            </div>
            <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{PREVIEW_FOOD.name}</h3>
            <p className="text-xs text-gray-600 leading-snug">{PREVIEW_FOOD.description}</p>
          </article>
        </div>
      </div>

      {/* MISSIONS STRIP — show every mission emoji so the writer can
          scan what's in every pack at a glance. France currently has
          the bonus wordsearch; the count derives from SECTION_KEYS
          so it stays honest as new sections roll out. */}
      <div className="px-6 sm:px-8 py-5 border-t border-gray-100">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">{SECTION_KEYS.length} missions in the France pack</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {SECTION_KEYS.map(k => (
            <div
              key={k}
              className="flex flex-col items-center justify-center gap-1 bg-sand-50 rounded-lg p-2 min-h-[4.5rem]"
              title={SECTION_LABELS[k]}
            >
              <span className="text-2xl leading-none" aria-hidden>{SECTION_EMOJI[k]}</span>
              <span className="text-[10px] text-gray-600 text-center leading-tight font-medium">
                {SECTION_LABELS[k]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
