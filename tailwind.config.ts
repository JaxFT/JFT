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
          50:  '#ecfaf2',
          100: '#d4f1de',
          200: '#9FE2BF',  // mint (chosen)
          300: '#96DED1',  // aqua-mint (chosen)
          400: '#5fc7a3',
          500: '#34a886',
          600: '#1e8a6e',  // primary — deep mint-teal, passes contrast on white text
          700: '#176d57',
          800: '#115441',
          900: '#0d4434',
          950: '#062821',
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
