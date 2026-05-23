import { chromium } from 'playwright'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  deviceScaleFactor: 2,
  viewport: { width: 800, height: 800 },
})
const page = await ctx.newPage()
const slugs = ['germany', 'hungary', 'netherlands', 'argentina', 'usa']
for (const slug of slugs) {
  await page.goto(`http://localhost:3001/adventure-packs/${slug}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `/tmp/flag-${slug}.png`, fullPage: false })
  console.log(slug)
}
await browser.close()
