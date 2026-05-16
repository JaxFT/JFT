import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f4faf7',  // very pale mint wash
          100: '#e3f1ea',  // pale, calm background tint
          200: '#c9e3d2',  // soft pastel mint (used for badges, hover tints)
          300: '#a6d4ba',  // softer mid mint
          400: '#7bbf99',  // gentle medium
          500: '#4ea27a',  // medium pastel-green
          600: '#2d8163',  // primary — slightly softer than before, still passes AA on white text
          700: '#235d4a',  // deeper for hover/active
          800: '#1e4c3d',  // dark mint
          900: '#173b30',  // very dark
          950: '#112b23',  // softer near-black, calmer for dark sections than before
        },
        sand: {
          50: '#fafaf7',
          100: '#f5f4f0',
          200: '#ebe9e1',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
