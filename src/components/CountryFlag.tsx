// Inline country flag, served as a PNG from flagcdn.com.
//
// We previously rendered country flags as text emoji like 🇫🇷 — which
// works on Android, macOS and iOS for most countries, but renders as
// a question-mark-in-a-box on some iOS Safari devices for a handful
// of newer or politically-fraught flags. PNGs are bulletproof.
//
// Pass `size` for a quick-pick height that roughly matches the text
// size it sits next to, or pass `className` to control it directly.

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const SIZE_CLASS: Record<Size, string> = {
  xs:   'h-3',   // ~12px — matches text-xs/sm
  sm:   'h-4',   // ~16px — matches text-base
  md:   'h-5',   // ~20px — matches text-lg
  lg:   'h-7',   // ~28px — matches text-2xl
  xl:   'h-9',   // ~36px — matches text-3xl
  '2xl': 'h-11', // ~44px — matches text-4xl
}

type Props = {
  iso2: string
  // Country name, used as the alt text for screen readers. When the
  // flag sits next to the spelled-out country name in the UI we pass
  // `aria-hidden` instead via `ariaHidden`.
  country?: string
  ariaHidden?: boolean
  size?: Size
  className?: string
}

export default function CountryFlag({
  iso2, country, ariaHidden, size = 'sm', className = '',
}: Props) {
  const code = iso2.toLowerCase()
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w40/${code}.png 1x, https://flagcdn.com/w80/${code}.png 2x`}
      alt={ariaHidden ? '' : (country ? `Flag of ${country}` : '')}
      aria-hidden={ariaHidden}
      className={`inline-block w-auto align-middle rounded-[1px] ${SIZE_CLASS[size]} ${className}`}
      loading="lazy"
      decoding="async"
    />
  )
}
