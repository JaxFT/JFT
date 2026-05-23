// One-off route used to export the system stamps as transparent PNGs.
// A Playwright script (scripts/export-stamps.mjs) opens this page in
// headless Chromium, screenshots each #stamp-<TYPE> element with
// omitBackground:true, and writes the PNGs into public/images/stamps/.
// Safe to delete the whole __stamp-export folder once the PNGs exist.

import PassportStamp from '@/components/passport/PassportStamp'
import type { StampType } from '@/lib/passport-types'

export const dynamic = 'force-static'

const STAMPS: StampType[] = [
  'BRAVE_EATER',
  'LOCAL_LINGO',
  'STEP_CHAMP',
  'ADVENTURE_PACK_COMPLETE',
  'EXPLORER_DAY',
  'CULTURE_SPOTTER',
  'NATURE_LOVER',
  'BRAVE_TRAVELLER',
  'WATER_ADVENTURER',
  'EARLY_BIRD',
  'MAP_READER',
  'MONEY_CHANGER',
  'GEOGRAPHY_GENIUS',
  'SCAVENGER_HUNTER',
  'ANIMAL_SPOTTER',
  'SENSE_SEEKER',
  'STORY_KEEPER',
  'FAMILY_CHATTERBOX',
]

export default function StampExportPage() {
  return (
    <main style={{ background: 'transparent', padding: 24 }}>
      {/* Body normally has bg-sand-50 from globals.css. Override it so
          Playwright's omitBackground:true gives us truly transparent
          PNGs. */}
      <style>{`
        html, body { background: transparent !important; }
        nav, footer { display: none !important; }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 320px)', gap: 24, justifyContent: 'start' }}>
        {STAMPS.map(t => (
          <div
            key={t}
            id={`stamp-${t}`}
            style={{
              width: 320,
              height: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
            }}
          >
            <div style={{ transform: 'scale(2)', transformOrigin: 'center center' }}>
              <PassportStamp type={t} rotate={0} size="md" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
