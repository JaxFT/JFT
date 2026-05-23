// One-off image optimisation script. Converts every PNG/JPG/JPEG in
// public/images (except the auto-generated stamps folder) to WebP with
// quality 85, leaving the original alongside as a fallback. Then prints
// a summary of bytes saved.
//
// Run with: node scripts/convert-to-webp.mjs
// After: update src paths in code from `.png` / `.jpg` to `.webp`.

import sharp from 'sharp'
import { readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', 'public', 'images')
const SKIP_DIRS = new Set(['stamps']) // auto-generated, not used on site
const MIN_BYTES = 15 * 1024 // skip only very small icons; WebP is still
                            // worth it down to ~15 KB JPGs / PNGs.

async function walk(dir) {
  const out = []
  for (const name of await readdir(dir)) {
    const full = join(dir, name)
    const s = await stat(full)
    if (s.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue
      out.push(...await walk(full))
    } else if (s.isFile()) {
      out.push({ path: full, size: s.size })
    }
  }
  return out
}

async function main() {
  const files = await walk(ROOT)
  let beforeTotal = 0
  let afterTotal = 0
  let converted = 0

  for (const { path, size } of files) {
    const ext = extname(path).toLowerCase()
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue
    if (size < MIN_BYTES) continue
    const webp = path.slice(0, -ext.length) + '.webp'
    if (existsSync(webp)) {
      // already converted, just count current sizes
      const w = await stat(webp)
      beforeTotal += size
      afterTotal += w.size
      continue
    }
    try {
      const img = sharp(path)
      // PNGs may have alpha — keep it lossless on those, lossy for jpgs.
      const buf = ext === '.png'
        ? await img.webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer()
        : await img.webp({ quality: 82, effort: 6 }).toBuffer()
      const fs = await import('node:fs/promises')
      await fs.writeFile(webp, buf)
      const w = await stat(webp)
      beforeTotal += size
      afterTotal += w.size
      converted++
      const pct = Math.round(100 - (w.size / size) * 100)
      console.log(`${basename(path).padEnd(45)} ${(size/1024).toFixed(0).padStart(5)}KB → ${(w.size/1024).toFixed(0).padStart(5)}KB  (-${pct}%)`)
    } catch (err) {
      console.error(`!  ${path}: ${err.message}`)
    }
  }
  const savedKB = (beforeTotal - afterTotal) / 1024
  const savedPct = beforeTotal ? Math.round(100 - (afterTotal / beforeTotal) * 100) : 0
  console.log(`\nConverted ${converted} new file(s). Total: ${(beforeTotal/1024).toFixed(0)}KB → ${(afterTotal/1024).toFixed(0)}KB (saved ${savedKB.toFixed(0)}KB, ${savedPct}%).`)
}

main().catch(err => { console.error(err); process.exit(1) })
