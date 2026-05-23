// One-off probe. Imports the new async getPackData() loader and prints
// the result. Used to verify the loader works outside the page auth gate.
const { getPackData } = await import('../src/lib/adventurePackData.ts')

for (const slug of ['peru', 'france', 'iceland', 'definitely-not-real']) {
  const t0 = Date.now()
  const data = await getPackData(slug)
  const ms = Date.now() - t0
  console.log(`${slug.padEnd(25)} ${data ? '✓ ' + data.country : '✗ null'} (${ms}ms)`)
}
