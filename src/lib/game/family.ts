// Procedural canvas avatars for the Adventure Game, drawn from BEHIND
// (over-the-shoulder camera, matching the reference concept art and
// the brief's "third-person / slightly elevated view looking down
// the road"). Dad, Mum and Jax are stylised back-view likenesses of
// the real Jax Family Travels family photo
// (public/images/us/bec-oli-jax.webp):
//   Oli (Dad)  — fully bald, broad frame, maroon shirt, grey
//                cross-body sling bag (the actual bag in the photo)
//   Bec (Mum)  — reddish-brown hair to the shoulders, dark top
//   Jax (Kid)  — pale blue-grey cap, black tee, smallest frame
// No facial features are needed or drawn — reactions read through
// body pose (arms up = cheer, arms flung out = shock), same as the
// reference art.

export type Reaction = 'idle' | 'cheer' | 'shock'

type DrawOpts = { ctx: CanvasRenderingContext2D; x: number; y: number; scale: number; reaction: Reaction; wobble: number }

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
  ctx.fill()
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(x, y, w, w * 0.32, 0, 0, Math.PI * 2)
  ctx.fill()
}

// Shoulders + torso, back view: wider at the shoulders, tapering
// slightly, always drawn with a subtle vertical gradient for volume
// instead of a flat fill.
function torso(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, shoulderW: number, h: number, color: string, dark: string) {
  const g = ctx.createLinearGradient(x - shoulderW * s, y, x + shoulderW * s, y)
  g.addColorStop(0, dark)
  g.addColorStop(0.5, color)
  g.addColorStop(1, dark)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x - shoulderW * s, y + 4 * s)
  ctx.quadraticCurveTo(x - shoulderW * s, y - 4 * s, x - shoulderW * 0.55 * s, y - 6 * s)
  ctx.lineTo(x + shoulderW * 0.55 * s, y - 6 * s)
  ctx.quadraticCurveTo(x + shoulderW * s, y - 4 * s, x + shoulderW * s, y + 4 * s)
  ctx.lineTo(x + shoulderW * 0.78 * s, y + h * s)
  ctx.quadraticCurveTo(x, y + h * s + 4 * s, x - shoulderW * 0.78 * s, y + h * s)
  ctx.closePath()
  ctx.fill()
}

function arms(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, shoulderW: number, color: string, reaction: Reaction, wobble: number) {
  ctx.strokeStyle = color
  ctx.lineWidth = 5 * s
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (reaction === 'cheer') {
    ctx.moveTo(x - shoulderW * 0.85 * s, y)
    ctx.lineTo(x - shoulderW * 1.7 * s, y - 16 * s + Math.sin(wobble) * s)
    ctx.moveTo(x + shoulderW * 0.85 * s, y)
    ctx.lineTo(x + shoulderW * 1.7 * s, y - 16 * s - Math.sin(wobble) * s)
  } else if (reaction === 'shock') {
    ctx.moveTo(x - shoulderW * 0.85 * s, y)
    ctx.lineTo(x - shoulderW * 1.9 * s, y + 4 * s + Math.sin(wobble * 2.4) * 2 * s)
    ctx.moveTo(x + shoulderW * 0.85 * s, y)
    ctx.lineTo(x + shoulderW * 1.9 * s, y + 4 * s - Math.sin(wobble * 2.4) * 2 * s)
  } else {
    const swing = Math.sin(wobble * 1.6) * 2 * s
    ctx.moveTo(x - shoulderW * 0.85 * s, y)
    ctx.lineTo(x - shoulderW * 1.05 * s, y + 15 * s + swing)
    ctx.moveTo(x + shoulderW * 0.85 * s, y)
    ctx.lineTo(x + shoulderW * 1.05 * s, y + 15 * s - swing)
  }
  ctx.stroke()
}

function headBack(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, skin: string) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.2, x, y, r * 1.1)
  g.addColorStop(0, lighten(skin))
  g.addColorStop(1, skin)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function lighten(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 255) + 28)
  const g = Math.min(255, ((n >> 8) & 255) + 28)
  const b = Math.min(255, (n & 255) + 28)
  return `rgb(${r},${g},${b})`
}

function bounce(reaction: Reaction, wobble: number, s: number) {
  return reaction === 'idle' ? Math.sin(wobble * 1.6) * 1.2 * s : 0
}

export function drawDad(o: DrawOpts) {
  const { ctx, x, y, scale: s, reaction, wobble } = o
  const bob = bounce(reaction, wobble, s)
  const lean = reaction === 'shock' ? Math.sin(wobble * 3) * 2 * s : 0
  shadow(ctx, x, y + 21 * s, 13 * s)
  torso(ctx, x + lean, y + bob, s, 12, 20, '#8a3546', '#5e2130')
  // grey cross-body sling bag, drawn on top of the torso
  ctx.strokeStyle = '#6b6f76'
  ctx.lineWidth = 3.2 * s
  ctx.beginPath()
  ctx.moveTo(x - 9 * s + lean, y - 5 * s + bob)
  ctx.lineTo(x + 7 * s + lean, y + 16 * s + bob)
  ctx.stroke()
  ctx.fillStyle = '#4b4f57'
  roundedRect(ctx, x + 3 * s + lean, y + 13 * s + bob, 9 * s, 8 * s, 2 * s)
  arms(ctx, x + lean, y + 2 * s + bob, s, 12, '#5e2130', reaction, wobble)
  headBack(ctx, x + lean * 1.4, y - 11 * s + bob, 7.5 * s, '#dba876')
  if (reaction === 'cheer') sparkle(ctx, x, y - 24 * s, s, wobble)
}

export function drawMum(o: DrawOpts) {
  const { ctx, x, y, scale: s, reaction, wobble } = o
  const bob = bounce(reaction, wobble, s)
  const lean = reaction === 'shock' ? Math.sin(wobble * 3) * 2 * s : 0
  shadow(ctx, x, y + 20 * s, 11.5 * s)
  torso(ctx, x + lean, y + bob, s, 10.5, 19, '#2b2b30', '#161618')
  arms(ctx, x + lean, y + 1 * s + bob, s, 10.5, '#161618', reaction, wobble)
  headBack(ctx, x + lean * 1.4, y - 10 * s + bob, 6.6 * s, '#e7bd8f')
  // hair falling to the shoulders, drawn over the head/torso join
  ctx.fillStyle = '#7a3d28'
  ctx.beginPath()
  ctx.moveTo(x - 7 * s + lean, y - 15 * s + bob)
  ctx.quadraticCurveTo(x - 9.5 * s + lean, y - 4 * s + bob, x - 6 * s + lean, y + 4 * s + bob)
  ctx.quadraticCurveTo(x, y - 2 * s + bob, x + 6 * s + lean, y + 4 * s + bob)
  ctx.quadraticCurveTo(x + 9.5 * s + lean, y - 4 * s + bob, x + 7 * s + lean, y - 15 * s + bob)
  ctx.quadraticCurveTo(x, y - 19 * s + bob, x - 7 * s + lean, y - 15 * s + bob)
  ctx.closePath()
  ctx.fill()
  if (reaction === 'cheer') sparkle(ctx, x, y - 22 * s, s, wobble)
}

export function drawJax(o: DrawOpts) {
  const { ctx, x, y, scale: sBase, reaction, wobble } = o
  const s = sBase * 0.86
  const bob = bounce(reaction, wobble, s)
  const lean = reaction === 'shock' ? Math.sin(wobble * 3) * 2 * s : 0
  shadow(ctx, x, y + 18 * s, 9.5 * s)
  torso(ctx, x + lean, y + bob, s, 9, 17, '#1c1c1e', '#0d0d0e')
  arms(ctx, x + lean, y + bob, s, 9, '#0d0d0e', reaction, wobble)
  headBack(ctx, x + lean * 1.4, y - 9 * s + bob, 6 * s, '#eec9a3')
  // cap, back view — crown + the little back strap/adjuster
  ctx.fillStyle = '#9fc0cc'
  ctx.beginPath()
  ctx.arc(x + lean * 1.4, y - 13 * s + bob, 6.6 * s, Math.PI * 0.05, Math.PI * 0.95)
  ctx.fill()
  ctx.fillStyle = '#7fa5b3'
  roundedRect(ctx, x - 1.5 * s + lean, y - 8.5 * s + bob, 3 * s, 2 * s, 1 * s)
  if (reaction === 'cheer') sparkle(ctx, x, y - 20 * s, s, wobble)
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, wobble: number) {
  ctx.fillStyle = '#ffd35c'
  const r = (2 + Math.sin(wobble * 4)) * s
  for (let i = 0; i < 3; i++) {
    const a = wobble * 3 + (i * Math.PI * 2) / 3
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s, r * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ── Generic crowd tourists (back view) ───────────────────
// A small deterministic palette so the crowd reads as a mixed group
// of travellers without per-frame randomness (which would flicker).
const HAIR = ['#2b2b2f', '#5a3826', '#8a5a2f', '#c9a13b', '#1a1a1a', '#a15c3e']
const OUTFIT = ['#3f7cac', '#e0568c', '#4ea27a', '#f0a500', '#7a5cad', '#e85d4b', '#2d8163', '#dd8a3c']

function touristPalette(i: number) {
  return {
    hair: HAIR[(i * 3 + 1) % HAIR.length],
    outfit: OUTFIT[(i * 5 + 2) % OUTFIT.length],
    backpack: i % 3 === 0,
    hat: i % 4 === 1,
  }
}

export function drawTourist(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, index: number) {
  const s = scale
  const p = touristPalette(index)
  shadow(ctx, x, y + 11 * s, 6.5 * s)
  torso(ctx, x, y, s * 0.62, 10, 18, p.outfit, shadeDown(p.outfit))
  if (p.backpack) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    roundedRect(ctx, x - 3.2 * s, y - 2 * s, 6.4 * s, 9 * s, 2 * s)
  }
  headBack(ctx, x, y - 6.5 * s, 4.6 * s, '#e3b78d')
  if (p.hat) {
    ctx.fillStyle = '#e0d2b4'
    ctx.beginPath()
    ctx.ellipse(x, y - 9.5 * s, 5.8 * s, 2.1 * s, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillStyle = p.hair
    ctx.beginPath()
    ctx.arc(x, y - 9 * s, 4.7 * s, Math.PI * 0.05, Math.PI * 0.95)
    ctx.fill()
  }
}

function shadeDown(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, ((n >> 16) & 255) - 35)
  const g = Math.max(0, ((n >> 8) & 255) - 35)
  const b = Math.max(0, (n & 255) - 35)
  return `rgb(${r},${g},${b})`
}
