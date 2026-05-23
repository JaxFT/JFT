// Adds loading="lazy" to every <img> tag in src/ that doesn't already
// have a loading= attribute. Skips a small allow-list of files where
// the <img> is a hero/cover image (better as loading="eager") or runs
// in a print/PDF context (lazy-loading would break rendering).

import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '..', 'src')

// Files where any <img> tag should NOT be touched (hero/cover/print).
// Path is relative to project root.
const SKIP_FILES = new Set([
  'src/app/page.tsx',                                  // homepage hero (already has fetchPriority=high)
  'src/app/blog/[slug]/page.tsx',                      // blog post cover (above fold)
  'src/components/blog/HeroBlogStack.tsx',             // homepage hero stack (above fold)
  'src/components/adventure-packs/FlagHalfBanner.tsx', // pack-page hero flag banner
  'src/app/admin/guides/[id]/pdf-builder/PdfBuilder.tsx', // PDF render, lazy breaks output
  'src/components/guide/PrintView.tsx',                // print render, lazy breaks output
  'src/lib/web-guide-download.ts',                     // string templates for PDF, not real JSX
])

async function walk(dir) {
  const out = []
  for (const name of await readdir(dir)) {
    const full = join(dir, name)
    const s = await stat(full)
    if (s.isDirectory()) out.push(...await walk(full))
    else if (s.isFile() && (name.endsWith('.tsx') || name.endsWith('.ts'))) out.push(full)
  }
  return out
}

async function main() {
  const files = await walk(SRC)
  let totalTagsTouched = 0
  let filesTouched = 0

  for (const path of files) {
    const rel = path.split('/JFT/')[1]
    if (SKIP_FILES.has(rel)) continue
    const src = await readFile(path, 'utf8')
    if (!src.includes('<img')) continue

    // Match <img ... > tag (handles multi-line attributes). Only rewrite
    // if there's no loading= attribute inside the tag.
    const re = /<img\b([^>]*?)\/?>/gs
    let touched = 0
    const next = src.replace(re, (match, attrs) => {
      if (/\bloading\s*=/.test(attrs)) return match
      touched++
      // Preserve self-closing vs open. Insert loading="lazy" right after <img.
      const isSelfClose = match.endsWith('/>')
      return `<img loading="lazy"${attrs}${isSelfClose ? '/>' : '>'}`
    })
    if (touched > 0) {
      await writeFile(path, next)
      console.log(`${rel}  +${touched}`)
      totalTagsTouched += touched
      filesTouched++
    }
  }
  console.log(`\nAdded loading="lazy" to ${totalTagsTouched} <img> tag(s) across ${filesTouched} file(s).`)
}

main().catch(err => { console.error(err); process.exit(1) })
