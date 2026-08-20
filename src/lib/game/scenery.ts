// Flat, silhouette-style decorative scenery for the Adventure Game.
// No image assets — just shape drawing — but gives each country a
// recognisable backdrop instead of a flat colour block.

export type PropKind = 'torii' | 'cherryBlossom' | 'pagoda' | 'palaceRoof' | 'lantern' | 'stupa' | 'palmTree' | 'karst' | 'junk'

const COUNTRY_PROPS: Record<string, PropKind[]> = {
  japan: ['torii', 'cherryBlossom', 'pagoda', 'cherryBlossom'],
  'south-korea': ['palaceRoof', 'lantern', 'palaceRoof', 'lantern'],
  thailand: ['stupa', 'palmTree', 'stupa', 'palmTree'],
  vietnam: ['karst', 'junk', 'karst', 'junk'],
}

export function propsFor(slug: string): PropKind[] {
  return COUNTRY_PROPS[slug] ?? ['pagoda', 'cherryBlossom', 'pagoda', 'cherryBlossom']
}

function trapezoid(ctx: CanvasRenderingContext2D, x: number, yTop: number, yBottom: number, topHalf: number, bottomHalf: number) {
  ctx.beginPath()
  ctx.moveTo(x - topHalf, yTop)
  ctx.lineTo(x + topHalf, yTop)
  ctx.lineTo(x + bottomHalf, yBottom)
  ctx.lineTo(x - bottomHalf, yBottom)
  ctx.closePath()
  ctx.fill()
}

export function drawTorii(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = '#c0392b'
  ctx.fillRect(x - 16 * s, y - 30 * s, 4 * s, 30 * s)
  ctx.fillRect(x + 12 * s, y - 30 * s, 4 * s, 30 * s)
  ctx.fillRect(x - 20 * s, y - 30 * s, 40 * s, 5 * s)
  ctx.fillRect(x - 17 * s, y - 22 * s, 34 * s, 3.5 * s)
  ctx.fillStyle = '#7a2318'
  ctx.fillRect(x - 20 * s, y - 33 * s, 40 * s, 3 * s)
}

export function drawCherryBlossom(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.strokeStyle = '#5a4433'
  ctx.lineWidth = 3 * s
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 16 * s)
  ctx.stroke()
  const blobs = [[-8, -26, 10], [8, -28, 11], [0, -34, 10], [-14, -20, 8], [14, -18, 8]]
  for (const [dx, dy, r] of blobs) {
    ctx.fillStyle = '#f7c6d9'
    ctx.beginPath()
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#f19bbf'
  ctx.beginPath()
  ctx.arc(x, y - 26 * s, 5 * s, 0, Math.PI * 2)
  ctx.fill()
}

export function drawPagoda(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const tiers = [
    { w: 26, yb: 0, yt: -10 },
    { w: 21, yb: -12, yt: -20 },
    { w: 16, yb: -22, yt: -29 },
  ]
  ctx.fillStyle = '#8f4a3c'
  for (const t of tiers) trapezoid(ctx, x, y + t.yt * s, y + t.yb * s, t.w * 0.6 * s, t.w * s)
  ctx.fillStyle = '#5a2c22'
  for (const t of tiers) ctx.fillRect(x - t.w * s, y + t.yb * s - 2 * s, t.w * 2 * s, 2.5 * s)
  ctx.fillStyle = '#c0392b'
  ctx.fillRect(x - 3 * s, y - 40 * s, 6 * s, 11 * s)
}

export function drawPalaceRoof(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = '#2f4858'
  ctx.beginPath()
  ctx.moveTo(x - 24 * s, y)
  ctx.quadraticCurveTo(x, y - 20 * s, x + 24 * s, y)
  ctx.lineTo(x + 18 * s, y + 3 * s)
  ctx.quadraticCurveTo(x, y - 12 * s, x - 18 * s, y + 3 * s)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#c0392b'
  ctx.fillRect(x - 12 * s, y + 3 * s, 24 * s, 8 * s)
}

export function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.strokeStyle = '#5a4433'
  ctx.lineWidth = 2 * s
  ctx.beginPath()
  ctx.moveTo(x, y - 26 * s)
  ctx.lineTo(x, y - 34 * s)
  ctx.stroke()
  ctx.fillStyle = '#c0392b'
  ctx.beginPath()
  ctx.ellipse(x, y - 16 * s, 8 * s, 11 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f2c744'
  ctx.fillRect(x - 8 * s, y - 18 * s, 16 * s, 3 * s)
}

export function drawStupa(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = '#c9992f'
  ctx.beginPath()
  ctx.ellipse(x, y - 4 * s, 20 * s, 9 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y - 12 * s, 13 * s, Math.PI, 0)
  ctx.fill()
  ctx.fillRect(x - 3 * s, y - 40 * s, 6 * s, 20 * s)
  ctx.fillStyle = '#f2c744'
  ctx.beginPath()
  ctx.moveTo(x, y - 42 * s)
  ctx.lineTo(x - 5 * s, y - 34 * s)
  ctx.lineTo(x + 5 * s, y - 34 * s)
  ctx.closePath()
  ctx.fill()
}

export function drawPalmTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.strokeStyle = '#8a6a3c'
  ctx.lineWidth = 4 * s
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + 8 * s, y - 20 * s, x + 2 * s, y - 34 * s)
  ctx.stroke()
  ctx.fillStyle = '#2d8163'
  const top = { x: x + 2 * s, y: y - 34 * s }
  for (let i = 0; i < 5; i++) {
    const a = (i / 4) * Math.PI - Math.PI * 0.1
    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.quadraticCurveTo(
      top.x + Math.cos(a) * 20 * s, top.y - 6 * s + Math.sin(a) * 8 * s,
      top.x + Math.cos(a) * 26 * s, top.y + Math.sin(a) * 14 * s
    )
    ctx.quadraticCurveTo(top.x + Math.cos(a) * 12 * s, top.y, top.x, top.y)
    ctx.fill()
  }
}

export function drawKarst(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = 'rgba(20,50,45,0.55)'
  ctx.beginPath()
  ctx.moveTo(x - 22 * s, y)
  ctx.quadraticCurveTo(x - 20 * s, y - 30 * s, x - 6 * s, y - 46 * s)
  ctx.quadraticCurveTo(x, y - 52 * s, x + 6 * s, y - 40 * s)
  ctx.quadraticCurveTo(x + 16 * s, y - 30 * s, x + 22 * s, y)
  ctx.closePath()
  ctx.fill()
}

export function drawJunk(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = '#3a2e22'
  ctx.beginPath()
  ctx.moveTo(x - 18 * s, y)
  ctx.quadraticCurveTo(x, y + 6 * s, x + 18 * s, y)
  ctx.lineTo(x + 14 * s, y - 3 * s)
  ctx.lineTo(x - 14 * s, y - 3 * s)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(180,60,50,0.75)'
  ctx.beginPath()
  ctx.moveTo(x - 2 * s, y - 3 * s)
  ctx.lineTo(x - 2 * s, y - 22 * s)
  ctx.lineTo(x + 12 * s, y - 3 * s)
  ctx.closePath()
  ctx.fill()
}

const DRAWERS: Record<PropKind, (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => void> = {
  torii: drawTorii,
  cherryBlossom: drawCherryBlossom,
  pagoda: drawPagoda,
  palaceRoof: drawPalaceRoof,
  lantern: drawLantern,
  stupa: drawStupa,
  palmTree: drawPalmTree,
  karst: drawKarst,
  junk: drawJunk,
}

export function drawProp(ctx: CanvasRenderingContext2D, kind: PropKind, x: number, y: number, s: number) {
  DRAWERS[kind](ctx, x, y, s)
}
