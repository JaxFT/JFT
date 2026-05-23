// One-off script. Boots the dev server (must already be running on
// http://localhost:3000), opens the temporary /__stamp-export route,
// and screenshots each #stamp-<TYPE> element with omitBackground:true
// to produce transparent PNGs under public/images/stamps/.
//
// Run with:
//   npm run dev   (in a separate terminal)
//   node scripts/export-stamps.mjs
//
// After it finishes you can delete src/app/__stamp-export/ and this
// script. The PNGs land in public/images/stamps/.

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const OUT_DIR = join(REPO_ROOT, 'public', 'images', 'stamps')
const URL = process.env.STAMP_EXPORT_URL ?? 'http://localhost:3000/__stamp-export'

const STAMPS = [
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

const TYPE_TO_FILE = {
  BRAVE_EATER: 'brave-eater',
  LOCAL_LINGO: 'local-lingo',
  STEP_CHAMP: 'step-champ',
  ADVENTURE_PACK_COMPLETE: 'pack-complete',
  EXPLORER_DAY: 'explorer-day',
  CULTURE_SPOTTER: 'culture-spotter',
  NATURE_LOVER: 'nature-lover',
  BRAVE_TRAVELLER: 'brave-traveller',
  WATER_ADVENTURER: 'water-adventurer',
  EARLY_BIRD: 'early-bird',
  MAP_READER: 'map-reader',
  MONEY_CHANGER: 'money-changer',
  GEOGRAPHY_GENIUS: 'geography-genius',
  SCAVENGER_HUNTER: 'scavenger-hunter',
  ANIMAL_SPOTTER: 'animal-spotter',
  SENSE_SEEKER: 'sense-seeker',
  STORY_KEEPER: 'story-keeper',
  FAMILY_CHATTERBOX: 'family-chatterbox',
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({
    deviceScaleFactor: 2, // crisper PNGs at 2x pixel density
    viewport: { width: 1200, height: 1800 },
  })
  const page = await context.newPage()

  console.log(`Opening ${URL}`)
  await page.goto(URL, { waitUntil: 'networkidle' })
  // Give the SVG filters a beat to settle.
  await page.waitForTimeout(400)

  for (const type of STAMPS) {
    const el = page.locator(`#stamp-${type}`)
    if (!(await el.count())) {
      console.warn(`!  Could not find #stamp-${type} on the page`)
      continue
    }
    const file = join(OUT_DIR, `${TYPE_TO_FILE[type]}.png`)
    await el.screenshot({ path: file, omitBackground: true })
    console.log(`-> ${file}`)
  }

  await browser.close()
  console.log(`Done. ${STAMPS.length} stamps in ${OUT_DIR}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
