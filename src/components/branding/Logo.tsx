// Jax | Family Travels wordmark logo. Inlined SVG so we can apply
// a linearGradient fill directly (blue-to-green ombre) without needing
// any image optimisation pipeline. Each instance gets a unique
// gradient id via useId so multiple logos on one page don't collide.
//
// The SVG paths are the wordmark itself; there's no separate "icon"
// shape to display alongside text. Use this on the navbar, footer,
// and any auth page heading where the brand mark should appear.

'use client'

import { useId } from 'react'

type LogoVariant = 'gradient' | 'onDark' | 'mono'

type Props = {
  className?: string
  // Height in pixels (or any CSS length string). Width follows the
  // SVG's natural aspect ratio (~2:1).
  height?: number | string
  // Visual treatment:
  //   gradient → blue→green ombre (default, for light backgrounds)
  //   onDark   → solid white (for dark navbar / footer)
  //   mono     → solid dark brand green (rare, for print etc.)
  variant?: LogoVariant
  // For SR / accessibility, defaults to "Jax | Family Travels".
  ariaLabel?: string
}

const VIEWBOX_W = 656.22
const VIEWBOX_H = 333.53

// Gradient stops, blue (left) to brand green (right). Adjust the
// numbers here if you want a different angle / colour balance.
const STOP_START = '#1e40af'   // Tailwind blue-800
const STOP_END   = '#2d8163'   // Tailwind brand-600

export default function Logo({ className, height = 32, variant = 'gradient', ariaLabel }: Props) {
  const raw = useId()
  const gradientId = `jft-logo-${raw.replace(/[:.]/g, '')}`
  const style = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: 'auto',
  } as const

  const fill =
    variant === 'onDark'   ? '#ffffff' :
    variant === 'mono'     ? '#173b30' :  // brand-900
                             `url(#${gradientId})`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      role="img"
      aria-label={ariaLabel ?? 'Jax | Family Travels'}
      className={className}
      style={style}
    >
      {variant === 'gradient' && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={STOP_START} />
            <stop offset="100%" stopColor={STOP_END} />
          </linearGradient>
        </defs>
      )}
      <g fill={fill}>
        <path d="M630.78,16.77h-198.74c-3.56,0-6.44,2.89-6.44,6.44v54.96c0,3.61,2.93,6.54,6.54,6.54h63.49v220.12c0,3.86,3.13,6.99,6.99,6.99h58.14c3.24,0,5.86-2.62,5.86-5.86V84.72h62.99c3.44,0,6.22-2.79,6.22-6.22V21.81c0-2.79-2.26-5.05-5.05-5.05Z" />
        <path d="M231.78,306.54c0,2.93,2.38,5.31,5.31,5.31h58.84c3.61,0,6.54-2.93,6.54-6.54v-104.27c-38.99,29.04-63.12,40.79-70.69,44.13v61.37Z" />
        <path d="M302.69,84.61h97.81c3.47,0,6.29-2.81,6.29-6.29V21.61c0-2.62-2.13-4.75-4.75-4.75h-164.52c-3.24,0-5.87,2.63-5.87,5.87v70.79l71.04,38.32v-47.23Z" />
        <path d="M157.93,185.32c-6.41-.67-10.39-1.97-12.83-3.22-2.17-1.1-3.73-3.1-4.31-5.45l-9.01-36.48s1.51,65.24-2.8,83.88c-4.31,18.64-25.98,27.5-51.5,24-16.75-2.29-36.1-8.6-47.43-12.67-4.71-1.69-9.66,1.8-9.66,6.8v59.73c0,2.33,1.57,4.37,3.82,4.98,63.46,17.28,99.52,9.08,123.17-3.51,30.22-16.08,41.54-35.44,48.7-54.87,8.16-22.14,6.64-57.15,6.64-57.15,0,0-30.35-4.54-44.8-6.06Z" />
        <path d="M202.73,141.86V22.4c0-3.06-2.48-5.54-5.54-5.54h-59.27c-3.43,0-6.2,2.78-6.2,6.2v76.62h26.79l44.22,42.18Z" />
        <path d="M439.99,161.44c-4.43-3.79-17.88-11.48-32.45-13.81-14.56-2.33-48.7.35-62.45,1.4-13.75,1.05-80.46,5.65-84.35,5.78s-34.6,2.01-39.36,1.97-14.2.39-18.65-.87c-4.45-1.27-8.17-3.41-14.07-9-5.9-5.59-14.97-15.06-18.5-18.96s-16.43-16.19-16.43-16.19h-17.04l15.82,61.17,82.72,9.09-23.48,48.87h24.88l70.24-47.02s75.03-1.04,83.37-1.08c8.34-.04,28.44-.74,39.54-3.71,11.1-2.97,14.69-6.73,15.16-9.17.39-2.07-.52-4.66-4.95-8.45Z" />
        <polygon points="293.08 140.35 234.67 107.93 213.65 107.93 230.17 143.76 293.08 140.35" />
      </g>
    </svg>
  )
}
