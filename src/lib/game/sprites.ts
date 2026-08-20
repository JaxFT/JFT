'use client'

// Real sprite art for the Adventure Game, sourced from Kenney.nl
// (CC0 / public domain, https://kenney.nl) — replaces the earlier
// procedurally-drawn shapes for characters, vehicles and trees.
// Characters are from the "RPG Urban Pack", cropped to their
// back-view (walking-away-from-camera) frame to match this game's
// over-the-shoulder camera. Vehicles/objects are from the "Racing
// Pack". Files are tiny (~0.5-2KB each) so this loads instantly even
// on a slow connection.

const cache = new Map<string, HTMLImageElement>()

function load(src: string): HTMLImageElement {
  // Module-level image construction also runs once during Next.js's
  // server-side render pass of this ('use client') component tree,
  // where the browser Image constructor doesn't exist. drawSprite's
  // `!img.complete` guard treats this placeholder as "not loaded yet"
  // and no-ops, so nothing ever actually tries to draw it server-side.
  if (typeof window === 'undefined') return {} as HTMLImageElement
  let img = cache.get(src)
  if (!img) {
    img = new Image()
    img.src = src
    cache.set(src, img)
  }
  return img
}

export function drawSprite(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, opacity = 1) {
  if (!img.complete || img.naturalWidth === 0) return
  if (opacity < 1) {
    ctx.globalAlpha = opacity
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h)
    ctx.globalAlpha = 1
  } else {
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h)
  }
}

export type CharKey = 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
export const CHAR_KEYS: CharKey[] = ['a', 'b', 'c', 'd', 'e', 'f']

export const CHAR_FRAMES: Record<CharKey, HTMLImageElement[]> = {
  a: [0, 1, 2].map(f => load(`/images/game/characters/char-a-${f}.png`)),
  b: [0, 1, 2].map(f => load(`/images/game/characters/char-b-${f}.png`)),
  c: [0, 1, 2].map(f => load(`/images/game/characters/char-c-${f}.png`)),
  d: [0, 1, 2].map(f => load(`/images/game/characters/char-d-${f}.png`)),
  e: [0, 1, 2].map(f => load(`/images/game/characters/char-e-${f}.png`)),
  f: [0, 1, 2].map(f => load(`/images/game/characters/char-f-${f}.png`)),
}

// Dad = bald back-of-head (matches Oli), Mum = longer hair (matches
// Bec), Jax = distinct dark hair, rendered smaller for the kid.
export const DAD_FRAMES = CHAR_FRAMES.e
export const MUM_FRAMES = CHAR_FRAMES.b
export const JAX_FRAMES = CHAR_FRAMES.f

export const VEHICLE_SPRITES = {
  black: load('/images/game/vehicles/car-black.png'),
  blue: load('/images/game/vehicles/car-blue.png'),
  green: load('/images/game/vehicles/car-green.png'),
  red: load('/images/game/vehicles/car-red.png'),
  yellow: load('/images/game/vehicles/car-yellow.png'),
}

export const OBJECT_SPRITES = {
  barrelRed: load('/images/game/objects/barrel-red.png'),
  barrierRed: load('/images/game/objects/barrier-red.png'),
  barrierWhite: load('/images/game/objects/barrier-white.png'),
  cone: load('/images/game/objects/cone.png'),
  rock1: load('/images/game/objects/rock1.png'),
  rock2: load('/images/game/objects/rock2.png'),
}

export const TREE_SPRITES = {
  green: load('/images/game/tiles/tree-green.png'),
  autumn: load('/images/game/tiles/tree-autumn.png'),
}
