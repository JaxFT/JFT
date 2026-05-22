import Link from 'next/link'
import type { Metadata } from 'next'
import { Stamp, Wand2, UserCheck, Sparkles, Crown, ArrowRight, PlayCircle, ListChecks, Award, Eye, BookOpen, Compass, MapPin, Plane } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isPremiumTier } from '@/lib/profile'
import UpgradeButton from '@/components/billing/UpgradeButton'
import PassportStamp from '@/components/passport/PassportStamp'
import MilestoneStamp from '@/components/passport/MilestoneStamp'
import ScatteredStampSheet from '@/components/passport/ScatteredStampSheet'
import PassportPage from '@/components/passport/PassportPage'
import { STAMP_META, AUTO_STAMP_TYPES, PERMISSION_LABELS, PERMISSION_DESCRIPTIONS, type StampType, type PermissionMode } from '@/lib/passport-types'

export const metadata: Metadata = {
  title: 'How Adventure Passport stamps work',
  description: 'A plain-English guide for parents: how kids earn stamps, how you can award them yourself, and how to use stamps to set challenges on the road.',
}

export const dynamic = 'force-dynamic'

// Grouped catalogue. The grouping is editorial, the source of truth
// for individual stamps is STAMP_META in passport-types.ts.
const PACK_MISSION_STAMPS: StampType[] = [
  'MAP_READER', 'LOCAL_LINGO', 'MONEY_CHANGER', 'BRAVE_EATER',
  'GEOGRAPHY_GENIUS', 'SCAVENGER_HUNTER', 'ANIMAL_SPOTTER',
  'SENSE_SEEKER', 'STORY_KEEPER', 'FAMILY_CHATTERBOX',
  'ADVENTURE_PACK_COMPLETE',
]
const REAL_WORLD_STAMPS: StampType[] = [
  'BRAVE_TRAVELLER', 'STEP_CHAMP', 'EXPLORER_DAY', 'CULTURE_SPOTTER',
  'NATURE_LOVER', 'WATER_ADVENTURER', 'EARLY_BIRD',
]

const CHALLENGE_IDEAS: Array<{ stamp: StampType; challenge: string }> = [
  { stamp: 'BRAVE_EATER',      challenge: '"Try three things off the menu you\'ve never had. Picture proof."' },
  { stamp: 'CULTURE_SPOTTER',  challenge: '"Find one mural, statue, or temple today and tell me what you think it means."' },
  { stamp: 'ANIMAL_SPOTTER',   challenge: '"Spot five animals on the country\'s list and tell me about your favourite over dinner."' },
  { stamp: 'EARLY_BIRD',       challenge: '"You\'re in charge of waking everyone up before sunrise tomorrow."' },
  { stamp: 'STEP_CHAMP',       challenge: '"10,000 steps before bed. Phone in your pocket counting."' },
  { stamp: 'STORY_KEEPER',     challenge: '"Read the Story mission in the Adventure Pack, then retell it to grandparents on video."' },
]

export default async function StampsExplainerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isPremium = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle()
    isPremium = isPremiumTier(profile?.subscription_tier)
  }

  const videoId = process.env.NEXT_PUBLIC_STAMPS_VIDEO_YOUTUBE_ID || null

  return (
    <div className="min-h-screen bg-sand-50 pt-24 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HERO */}
        <header className="text-center mb-14">
          <p className="text-xs font-bold tracking-widest uppercase text-brand-600 mb-3 inline-flex items-center gap-1.5">
            <Stamp className="w-3.5 h-3.5" /> Adventure Passport
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
            How the stamps work.
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
            Stamps are the heartbeat of the Adventure Passport. Kids earn them by doing real things, on the ground, with you. Here&apos;s every way that happens, plus how to turn stamps into your own little family challenges.
          </p>
        </header>

        {/* 3 WAYS KIDS EARN STAMPS */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Three ways a kid earns a stamp</h2>
          <p className="text-sm text-gray-500 mb-6">All three feed into the same passport. Mix and match.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center mb-4">
                <Wand2 className="w-5 h-5 text-brand-700" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">1. Automatically</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                When your child finishes a mission in an Adventure Pack, the matching stamp fires. The Food, Language and Animal stamps require at least three real interactions first so it isn&apos;t earned by tapping &ldquo;done&rdquo;.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center mb-4">
                <Award className="w-5 h-5 text-brand-700" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">2. You award it</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Open your child&apos;s page → &ldquo;Award a stamp&rdquo;. Pick any stamp, optionally tie it to a country, and even backdate it if it happened last week. Useful for offline moments the app can&apos;t see.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center mb-4">
                <UserCheck className="w-5 h-5 text-brand-700" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">3. They suggest it</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                In <strong>Creator</strong> mode, older kids can suggest stamps themselves on their scan-in flow. The suggestion lands on your dashboard waiting for your tick.
              </p>
            </div>
          </div>
        </section>

        {/* CHALLENGES */}
        <section className="mb-14">
          <div className="bg-brand-950 text-white rounded-2xl p-6 sm:p-8">
            <p className="text-xs font-bold tracking-widest uppercase text-brand-300 mb-3 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> The fun bit
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">Use stamps to set your kids challenges.</h2>
            <p className="text-white/80 leading-relaxed text-sm sm:text-base max-w-2xl mb-6">
              Pick a stamp, turn it into a challenge for the day, award it when they pull it off. Stamps stop being something the app gives them and become something they earn from you. A few we&apos;ve actually used:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHALLENGE_IDEAS.map(({ stamp, challenge }) => {
                const meta = STAMP_META[stamp]
                return (
                  <li key={stamp} className="bg-brand-900/50 rounded-xl p-4 border border-brand-700/40 flex items-start gap-3">
                    <span className="text-2xl shrink-0 leading-none" aria-hidden>{meta.emoji}</span>
                    <div>
                      <p className="font-bold text-white text-sm mb-0.5">{meta.label}</p>
                      <p className="text-sm text-white/80 leading-relaxed">{challenge}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="text-xs text-white/60 mt-5">Award the stamp from your child&apos;s page on the day. Backdate if they smashed the challenge while you were busy.</p>
          </div>
        </section>

        {/* PARENT CONTROLS */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">What you control</h2>
          <p className="text-sm text-gray-500 mb-6">Every child has their own settings, so a 5-year-old and a 12-year-old can live in the same family with very different experiences.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-2 inline-flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-brand-600" /> Auto-approve
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                On: stamps the system fires from finished missions land in the passport instantly. Off (default): they wait for your tick. Good for younger kids whose &ldquo;completion&rdquo; can be optimistic. Toggle per child.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-2 inline-flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-600" /> Permission modes
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Each child is in one of three modes that decides what they can do when they scan in. Set when you create the child, change any time.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">Permission modes</p>
            <ul className="space-y-3">
              {(['view', 'guided', 'creator'] as PermissionMode[]).map(mode => (
                <li key={mode} className="flex items-start gap-3">
                  <span className="text-xs font-bold tracking-widest uppercase text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full shrink-0 mt-0.5">{PERMISSION_LABELS[mode]}</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{PERMISSION_DESCRIPTIONS[mode]}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* VIDEO */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Watch us walk through it</h2>
          <p className="text-sm text-gray-500 mb-5">A quick run-through of the same ideas, faster than reading.</p>
          {videoId ? (
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-black aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="How Adventure Passport stamps work"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
              <PlayCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Explainer video coming soon.</p>
            </div>
          )}
        </section>

        {/* STAMP CATALOGUE */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Every stamp in the book</h2>
          <p className="text-sm text-gray-500 mb-6">There are {Object.keys(STAMP_META).length} stamps in total, grouped by how they tend to show up.</p>

          <CatalogueGroup
            title="Adventure Pack stamps"
            subtitle="Earned by finishing a section of an Adventure Pack. The 11 main pack stamps plus the &ldquo;all sections done&rdquo; trophy."
            types={PACK_MISSION_STAMPS}
            badge="auto"
          />

          <div className="mt-10" />
          <CatalogueGroup
            title="Real-world stamps"
            subtitle="Mostly award-it-yourself stamps for things that happen off-screen. Brave Traveller fires automatically when you log a flight on the flight log."
            types={REAL_WORLD_STAMPS}
            badge="parent"
          />
        </section>

        {/* MILESTONES */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bigger badges as they explore</h2>
          <p className="text-sm text-gray-500 mb-6">As the passport fills up, your child unlocks larger milestone badges. These appear automatically when the count crosses each tier:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Compass, label: 'Country count', body: '1, 5, 10, 15, 20, 30, and 50 different countries visited. The very first stamp shows the country&apos;s actual flag.' },
              { icon: MapPin,  label: 'Continent count', body: '2 through 7 continents explored, with a continent-specific badge for each new one.' },
              { icon: BookOpen, label: 'Brave Eater tiers', body: 'Tried the local food in 5, 10, 15, or 20 different countries.' },
              { icon: Plane,   label: 'Home country',  body: 'Whichever country you set as &ldquo;home&rdquo; doesn&apos;t count toward travel milestones, so kids only get credit for the world beyond their front door.' },
            ].map(item => (
              <li key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center mb-3">
                  <item.icon className="w-4 h-4 text-brand-700" />
                </div>
                <p className="font-bold text-gray-900 text-sm mb-1">{item.label}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* DENSITY PREVIEW — what a Global Stamps page looks like
            with ~30 stamps. Mix of system + milestone + sample
            custom. Use this to evaluate whether to cap, paginate,
            or just let it grow with internal scroll. */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Density preview: 30 stamps</h2>
          <p className="text-sm text-gray-500 mb-6">
            Sample of what the Global Stamps page will look like once custom stamps are in play and a kid has been at it a while. Mix of system stamps, milestone badges, and parent/kid customs.
          </p>
          <div className="bg-brand-950 rounded-2xl p-4 sm:p-6">
            <PassportPage className="p-6 sm:p-8">
              <div className="flex items-baseline justify-between mb-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em]" style={{ color: '#5a3a12' }}>
                  Global Stamps · Sample
                </p>
                <p className="text-xs uppercase tracking-widest" style={{ color: '#5a3a12', opacity: 0.6 }}>
                  30 stamps
                </p>
              </div>
              <ScatteredStampSheet seed="density-preview">
                {DENSITY_PREVIEW.map((entry, i) => {
                  if (entry.kind === 'system') {
                    return <PassportStamp key={i} type={entry.type} size="sm" date={entry.date} country={entry.country} />
                  }
                  return (
                    <MilestoneStamp
                      key={i}
                      label={entry.label}
                      emoji={entry.emoji}
                      ink={entry.ink}
                      shape={entry.shape}
                      date={entry.date}
                      size="sm"
                    />
                  )
                })}
              </ScatteredStampSheet>
            </PassportPage>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="bg-brand-950 text-white rounded-2xl p-6 sm:p-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to start your family&apos;s passport?</h2>
            <p className="text-white/70 max-w-md mx-auto leading-relaxed mb-6">
              Adventure Passports come with Premium, £49.99 a year for every child in your family, every Adventure Pack, every guide, every premium blog post.
            </p>
            <div className="flex flex-col items-center gap-2">
              {isPremium ? (
                <Link href="/family" className="btn-primary text-base px-7 py-3">
                  Open my family <ArrowRight className="w-4 h-4" />
                </Link>
              ) : user ? (
                <UpgradeButton className="btn-primary text-base px-7 py-3" withCrown />
              ) : (
                <Link href="/signup?next=/passports" className="btn-primary text-base px-7 py-3">
                  <Crown className="w-4 h-4" /> Get started <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

// Mix of stamp variants used by the density preview at the bottom of
// the page. Order is intentional — recent at top, older at bottom —
// so the scattered layout has a chronological feel.
type PreviewEntry =
  | { kind: 'system';    type: StampType; country?: string | null; date: string }
  | { kind: 'milestone'; label: string;   emoji: string; ink: string;
      shape: 'circle' | 'oval' | 'rounded' | 'shield' | 'hexagon' | 'flag'; date: string }

const DENSITY_PREVIEW: PreviewEntry[] = [
  // Milestone badges (count-based achievements)
  { kind: 'milestone', label: '5 Countries',          emoji: '🌍', ink: '#0f3a2a', shape: 'oval',    date: '2026-04-21' },
  { kind: 'milestone', label: 'Brave Eater · 5',      emoji: '🍜', ink: '#9c2516', shape: 'rounded', date: '2026-04-12' },
  { kind: 'milestone', label: 'Europe Explorer',      emoji: '🏰', ink: '#1e3a8a', shape: 'oval',    date: '2026-03-30' },
  { kind: 'milestone', label: 'Asia Explorer',        emoji: '🏯', ink: '#9c2516', shape: 'rounded', date: '2026-02-18' },
  { kind: 'milestone', label: 'Africa Explorer',      emoji: '🐘', ink: '#15803d', shape: 'shield',  date: '2026-01-08' },
  { kind: 'milestone', label: '3 Continents',         emoji: '🌎', ink: '#5b21b6', shape: 'hexagon', date: '2026-01-08' },

  // Custom stamps — parent or kid created. Free-form labels.
  { kind: 'milestone', label: 'Treehouse Sleepover',  emoji: '🌳', ink: '#15803d', shape: 'circle',  date: '2026-05-02' },
  { kind: 'milestone', label: 'First Solo Order',     emoji: '🥐', ink: '#5a3a12', shape: 'oval',    date: '2026-04-28' },
  { kind: 'milestone', label: 'Camel Ride',           emoji: '🐪', ink: '#9c2516', shape: 'rounded', date: '2026-04-15' },
  { kind: 'milestone', label: 'Lost a Tooth',         emoji: '🦷', ink: '#1e3a8a', shape: 'circle',  date: '2026-03-22' },
  { kind: 'milestone', label: 'Picked Up Snorkel',    emoji: '🤿', ink: '#1e3a8a', shape: 'oval',    date: '2026-03-15' },
  { kind: 'milestone', label: 'Sushi Solo',           emoji: '🍣', ink: '#9c2516', shape: 'rounded', date: '2026-02-28' },
  { kind: 'milestone', label: 'Train Conductor Day',  emoji: '🚂', ink: '#5b21b6', shape: 'shield',  date: '2026-02-10' },
  { kind: 'milestone', label: 'Rainforest Walk',      emoji: '🌴', ink: '#15803d', shape: 'hexagon', date: '2026-01-25' },
  { kind: 'milestone', label: 'First Long-Haul',      emoji: '✈️', ink: '#1e3a8a', shape: 'oval',    date: '2026-01-12' },

  // System stamps from a few different countries
  { kind: 'system', type: 'BRAVE_EATER',             country: 'Japan',          date: '2026-05-10' },
  { kind: 'system', type: 'LOCAL_LINGO',             country: 'Japan',          date: '2026-05-09' },
  { kind: 'system', type: 'CULTURE_SPOTTER',         country: 'Japan',          date: '2026-05-08' },
  { kind: 'system', type: 'ADVENTURE_PACK_COMPLETE', country: 'Japan',          date: '2026-05-11' },
  { kind: 'system', type: 'STEP_CHAMP',              country: null,             date: '2026-04-25' },
  { kind: 'system', type: 'BRAVE_EATER',             country: 'Morocco',        date: '2026-04-05' },
  { kind: 'system', type: 'BRAVE_TRAVELLER',         country: null,             date: '2026-03-28' },
  { kind: 'system', type: 'SCAVENGER_HUNTER',        country: 'France',         date: '2026-03-19' },
  { kind: 'system', type: 'MAP_READER',              country: 'France',         date: '2026-03-18' },
  { kind: 'system', type: 'MONEY_CHANGER',           country: 'France',         date: '2026-03-17' },
  { kind: 'system', type: 'STORY_KEEPER',            country: 'Indonesia',      date: '2026-02-15' },
  { kind: 'system', type: 'ANIMAL_SPOTTER',          country: 'Indonesia',      date: '2026-02-14' },
  { kind: 'system', type: 'NATURE_LOVER',            country: null,             date: '2026-01-30' },
  { kind: 'system', type: 'WATER_ADVENTURER',        country: 'Thailand',       date: '2026-01-22' },
  { kind: 'system', type: 'EARLY_BIRD',              country: null,             date: '2026-01-04' },
]

// Deterministic-but-varied sample date per stamp type, so the preview
// looks like a real lived-in passport rather than every stamp being
// dated the same day.
function sampleDateForStamp(type: StampType): string {
  let h = 0
  for (let i = 0; i < type.length; i++) h = (h * 31 + type.charCodeAt(i)) >>> 0
  const daysAgo = (h % 240) + 7
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function CatalogueGroup({
  title, subtitle, types, badge,
}: {
  title: string
  subtitle: string
  types: StampType[]
  badge: 'auto' | 'parent'
}) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500" dangerouslySetInnerHTML={{ __html: subtitle }} />
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {types.map(t => {
          const meta = STAMP_META[t]
          const isAuto = AUTO_STAMP_TYPES.includes(t)
          // Even within a group, surface whether a stamp can fire
          // automatically or must be parent-awarded. Keeps the
          // "how do I get this one?" clear.
          const earnedLabel = badge === 'auto' || isAuto ? 'Auto + manual' : 'You award it'
          return (
            <li key={t} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className="shrink-0 flex items-center justify-center">
                <PassportStamp type={t} size="md" date={sampleDateForStamp(t)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 text-sm">{meta.label}</p>
                <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{meta.description}</p>
                <p className="text-[10px] font-bold tracking-widest uppercase text-brand-700 mt-2">{earnedLabel}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
