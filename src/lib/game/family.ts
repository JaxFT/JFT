// Real sprite-based rendering for the Adventure Game's characters —
// see sprites.ts for where the art comes from. Dad/Mum/Jax use their
// dedicated back-view frames (bald/longer-hair/dark-hair respectively,
// picked to echo the real family photo at
// public/images/us/bec-oli-jax.webp), generic crowd tourists cycle
// through the remaining palettes.

import { drawSprite, CHAR_FRAMES, DAD_FRAMES, MUM_FRAMES, JAX_FRAMES, type CharKey, CHAR_KEYS } from './sprites'

export type Reaction = 'idle' | 'cheer' | 'shock'

type DrawOpts = { ctx: CanvasRenderingContext2D; x: number; y: number; scale: number; reaction: Reaction; wobble: number }

function walkFrame(frames: HTMLImageElement[], wobble: number): HTMLImageElement {
  return frames[Math.floor(wobble * 2) % frames.length]
}

function bob(reaction: Reaction, wobble: number, s: number) {
  return reaction === 'idle' ? Math.abs(Math.sin(wobble * 1.6)) * 1.5 * s : 0
}

function shake(reaction: Reaction, wobble: number, s: number) {
  return reaction === 'shock' ? Math.sin(wobble * 5) * 2.5 * s : 0
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(x, y, w, w * 0.32, 0, 0, Math.PI * 2)
  ctx.fill()
}

function hitFlash(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, reaction: Reaction) {
  if (reaction !== 'shock') return
  ctx.fillStyle = 'rgba(220,60,50,0.35)'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, wobble: number) {
  ctx.fillStyle = '#ffd35c'
  const r = (2 + Math.sin(wobble * 4)) * s
  for (let i = 0; i < 3; i++) {
    const a = wobble * 3 + (i * Math.PI * 2) / 3
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * 7 * s, y + Math.sin(a) * 7 * s, r * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawFamilyMember(o: DrawOpts, frames: HTMLImageElement[], size: number) {
  const { ctx, x, y, scale: s, reaction, wobble } = o
  const jump = reaction === 'cheer' ? -Math.abs(Math.sin(wobble * 3)) * 6 * s : 0
  const dx = shake(reaction, wobble, s)
  const dy = bob(reaction, wobble, s) + jump
  shadow(ctx, x, y + size * 0.42 * s, size * 0.32 * s)
  const frame = walkFrame(frames, wobble)
  drawSprite(ctx, frame, x + dx, y + dy, size * s, size * s)
  hitFlash(ctx, x + dx, y + dy, size * 0.4 * s, reaction)
  if (reaction === 'cheer') sparkle(ctx, x, y - size * 0.55 * s, s, wobble)
}

export function drawDad(o: DrawOpts) {
  drawFamilyMember(o, DAD_FRAMES, 30)
}

export function drawMum(o: DrawOpts) {
  drawFamilyMember(o, MUM_FRAMES, 27)
}

export function drawJax(o: DrawOpts) {
  drawFamilyMember({ ...o, scale: o.scale * 0.82 }, JAX_FRAMES, 26)
}

// Deterministic per-slot palette so the crowd reads as a mixed group
// without per-frame randomness (which would flicker).
export function touristKey(i: number): CharKey {
  return CHAR_KEYS[i % CHAR_KEYS.length]
}

export function drawTourist(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, index: number, wobble = 0, reaction: Reaction = 'idle') {
  const key = touristKey(index)
  const frames = CHAR_FRAMES[key]
  // offset each tourist's walk-cycle phase by its index so a whole
  // crowd doesn't bob in perfect unison
  const frame = walkFrame(frames, wobble + index * 0.7)
  const size = 22
  shadow(ctx, x, y + size * 0.4 * scale, size * 0.28 * scale)
  drawSprite(ctx, frame, x, y, size * scale, size * scale)
  hitFlash(ctx, x, y, size * 0.4 * scale, reaction)
}
