import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Compass } from 'lucide-react'
import type { Metadata } from 'next'
import KidBackButton from '@/components/passport/KidBackButton'
import {
  getChildByToken,
  listCountryVisitsForFamily,
  listStampsForChildCountry,
  getKidPackProgress,
} from '@/lib/passport-kid-db'
import { listJournalEntriesForChildCountry } from '@/lib/passport-journal-db'
import { getPackMeta, getPackByIso2, getPackSectionCount } from '@/lib/adventurePackMeta'
import PassportPage from '@/components/passport/PassportPage'
import TappableStamp from '@/components/passport/TappableStamp'
import FlagBanner from '@/components/adventure-packs/FlagBanner'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string; slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const meta = getPackMeta(slug)
  return {
    title: meta ? `${meta.country} Passport` : 'Country',
    robots: { index: false, follow: false },
  }
}

export default async function KidCountryPage({
  params,
}: {
  params: Promise<{ token: string; slug: string }>
}) {
  const { token, slug } = await params
  const meta = getPackMeta(slug)
  if (!meta) notFound()

  const child = await getChildByToken(token)
  if (!child) notFound()

  const [visits, stamps, progress, journal] = await Promise.all([
    listCountryVisitsForFamily(child.parent_id),
    listStampsForChildCountry(child.id, slug),
    getKidPackProgress(child.id, slug),
    listJournalEntriesForChildCountry(child.id, slug),
  ])

  // The country must actually be in the family's visit list, otherwise
  // a kid could brute-force any /kid/{token}/country/{slug} URL. We
  // give them a "not yet" page rather than a hard 404 — clearer.
  const thisVisit = visits.find(v => v.iso2 === meta.iso2)

  // Prev/Next navigation between visited countries (kid is flipping
  // through their book). Sorted by first_visit_date ascending — same
  // order as Countries tab.
  const visitedSorted = [...visits].sort((a, b) =>
    a.first_visit_date < b.first_visit_date ? -1 : 1,
  )
  const idx = thisVisit ? visitedSorted.findIndex(v => v.iso2 === meta.iso2) : -1
  const prevVisit = idx > 0 ? visitedSorted[idx - 1] : null
  const nextVisit = idx >= 0 && idx < visitedSorted.length - 1 ? visitedSorted[idx + 1] : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-900 to-brand-950 text-white pt-6 pb-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-4">
          <KidBackButton fallbackHref={`/kid/${token}`} label="Back" variant="onDark" />
        </div>

        <PassportPage className="p-6 sm:p-10">
          {/* PAGE HEADER: flag banner + first visit date */}
          <div className="mb-6">
            <FlagBanner
              iso2={meta.iso2}
              country={meta.country}
              fallbackColour={meta.heroColour}
              size="md"
              rounded
              as="h1"
            />
            <p
              className="mt-3 text-xs uppercase tracking-widest"
              style={{ color: '#5a3a12', opacity: 0.7 }}
            >
              {thisVisit ? (
                <>First visit · {formatDate(thisVisit.first_visit_date)}</>
              ) : (
                <>Not yet visited</>
              )}
            </p>
          </div>

          {/* PACK PROGRESS */}
          <section className="mb-7">
            <div
              className="flex items-center gap-2 mb-3"
              style={{ color: '#5a3a12' }}
            >
              <Compass className="w-4 h-4" />
              <p className="text-xs font-extrabold uppercase tracking-[0.2em]">Adventure pack</p>
            </div>
            <Link
              href={`/kid/${token}/pack/${slug}`}
              className="block bg-white/60 hover:bg-white rounded-xl p-4 transition-colors"
              style={{ color: '#3a2810' }}
            >
              {(() => {
                const totalSections = getPackSectionCount(slug)
                const done = Math.min(progress?.missionsComplete?.length ?? 0, totalSections)
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-bold">
                          {progress?.completedAt ? 'Pack complete' :
                           done > 0
                             ? `${done} of ${totalSections} missions done`
                             : 'Tap to start'}
                        </p>
                        {progress?.completedAt && (
                          <p className="text-xs mt-0.5 opacity-70 inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Finished {formatDate(progress.completedAt)}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 opacity-50" />
                    </div>
                    {progress && !progress.completedAt && done > 0 && (
                      <div className="mt-3 h-1 bg-amber-900/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-600 transition-all"
                          style={{ width: `${(done / totalSections) * 100}%` }}
                        />
                      </div>
                    )}
                  </>
                )
              })()}
            </Link>
          </section>

          {/* STAMPS FOR THIS COUNTRY */}
          <section>
            <div
              className="flex items-baseline justify-between mb-4"
              style={{ color: '#5a3a12' }}
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.2em]">Stamps from {meta.country}</p>
              <p className="text-xs uppercase tracking-widest opacity-60">
                {stamps.length === 0 ? 'Empty' : `${stamps.length} ${stamps.length === 1 ? 'stamp' : 'stamps'}`}
              </p>
            </div>
            {stamps.length === 0 ? (
              <p
                className="text-center text-xs uppercase tracking-widest py-8"
                style={{ color: '#5a3a12', opacity: 0.7 }}
              >
                No stamps from {meta.country} yet
              </p>
            ) : (
              <div className="flex flex-wrap items-start justify-center gap-x-5 gap-y-6 py-3">
                {stamps.map(s => (
                  <TappableStamp
                    key={s.id}
                    kind="row"
                    row={s}
                    country={meta.country}
                    date={s.earned_at}
                    size="sm"
                  />
                ))}
              </div>
            )}
          </section>

          {/* JOURNAL ENTRIES tied to this country */}
          {journal.length > 0 && (
            <section className="mt-7">
              <div
                className="flex items-baseline justify-between mb-3"
                style={{ color: '#5a3a12' }}
              >
                <p className="text-xs font-extrabold uppercase tracking-[0.2em]">From the journal</p>
                <p className="text-xs uppercase tracking-widest opacity-60">
                  {journal.length} {journal.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
              <ul className="space-y-3">
                {journal.map(e => {
                  const [maybePrompt, ...rest] = (e.text ?? '').split('\n\n')
                  const body = rest.length > 0 ? rest.join('\n\n') : (e.text ?? '')
                  const prompt = rest.length > 0 ? maybePrompt : null
                  return (
                    <li
                      key={e.id}
                      className="bg-white/50 rounded-xl p-4"
                      style={{ color: '#3a2810' }}
                    >
                      <div className="flex items-baseline gap-2 mb-1.5 text-xs">
                        {e.place && (
                          <span className="font-semibold">{e.place}</span>
                        )}
                        <span className="opacity-50">{e.place ? '· ' : ''}{formatDate(e.created_at)}</span>
                        {e.emoji_rating && <span className="text-base ml-auto">{e.emoji_rating}</span>}
                      </div>
                      {prompt && <p className="text-xs font-bold italic mb-1 opacity-80">{prompt}</p>}
                      {body && <p className="text-sm leading-relaxed whitespace-pre-wrap">{body}</p>}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* PAGE-TURN FOOTER: prev / next country, like flipping pages */}
          <footer
            className="mt-10 pt-5 flex items-center justify-between text-xs"
            style={{ borderTop: '1px dashed rgba(120,80,30,0.25)', color: '#5a3a12' }}
          >
            {prevVisit && getPackByIso2(prevVisit.iso2) ? (
              <Link
                href={`/kid/${token}/country/${getPackByIso2(prevVisit.iso2)!.slug}`}
                className="inline-flex items-center gap-1.5 hover:opacity-80"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="uppercase tracking-widest">{getPackByIso2(prevVisit.iso2)?.country}</span>
              </Link>
            ) : <span />}
            <p className="uppercase tracking-widest opacity-50">
              {thisVisit ? `Page ${idx + 1} of ${visitedSorted.length}` : ''}
            </p>
            {nextVisit && getPackByIso2(nextVisit.iso2) ? (
              <Link
                href={`/kid/${token}/country/${getPackByIso2(nextVisit.iso2)!.slug}`}
                className="inline-flex items-center gap-1.5 hover:opacity-80"
              >
                <span className="uppercase tracking-widest">{getPackByIso2(nextVisit.iso2)?.country}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : <span />}
          </footer>
        </PassportPage>
      </div>
    </div>
  )
}

function formatDate(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
