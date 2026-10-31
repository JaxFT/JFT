// Next.js 16 dropped `next lint`; this is the flat config it recommends.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: ['.next/**', '.open-next/**', 'node_modules/**', 'public/**', 'src/app/i-want-to-travel/family-way.ts'] },
]

export default config
