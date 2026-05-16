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
          50:  '#f0f7f3',
          100: '#dceee4',
          200: '#b9ddca',
          300: '#8dc4a9',
          400: '#5ea484',
          500: '#3d8566',
          600: '#2d6b4f',  // primary
          700: '#245540',
          800: '#1e4434',
          900: '#19382c',
          950: '#0d2019',
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
