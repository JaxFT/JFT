// One-off conversion script. Reads every PACK_META slug, calls the
// existing in-memory getPackData() to merge in animals, and writes the
// full AdventurePackData out as a static JSON file in public/data/packs/.
// After this runs, the giant adventurePackData.ts and adventurePackAnimals.ts
// can be slimmed down to just the loader, dropping ~1.2 MB from the
// Cloudflare Worker bundle.
//
// Run with:  npx tsx scripts/extract-pack-json.ts

import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { PACK_META } from '../src/lib/adventurePackMeta'
import { getPackData } from '../src/lib/adventurePackData'

const OUT = join(process.cwd(), 'public', 'data', 'packs')

async function main() {
  await mkdir(OUT, { recursive: true })
  let ok = 0
  let missing = 0
  for (const meta of PACK_META) {
    const data = getPackData(meta.slug)
    if (!data) {
      console.warn(`!  ${meta.slug}: no data — skipping`)
      missing++
      continue
    }
    const file = join(OUT, `${meta.slug}.json`)
    await writeFile(file, JSON.stringify(data))
    ok++
  }
  console.log(`\nWrote ${ok} pack JSON file(s) to ${OUT}.  Missing: ${missing}.`)
}

main().catch(err => { console.error(err); process.exit(1) })
