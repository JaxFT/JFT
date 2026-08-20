// Procedurally-drawn suitcases — these replace the generic "tourist"
// crowd members. Simple hard-shell geometry draws cleanly at small
// sizes without needing sprite art, unlike people.

export type LuggageReaction = 'idle' | 'shock'

const PALETTE = ['#d64550', '#3f7cac', '#0a8f6d', '#e0a526', '#2b2b30', '#c25b9e', '#2d8163', '#a15c3e']

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
}

export function luggageColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}

export function drawSuitcase(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  index: number,
  wobble = 0,
  reaction: LuggageReaction = 'idle',
) {
  const s = scale
  const color = luggageColor(index)
  const bob = Math.abs(Math.sin(wobble * 1.5 + index * 0.6)) * 1.1 * s
  const shake = reaction === 'shock' ? Math.sin(wobble * 6) * 2.2 * s : 0
  const bx = x + shake
  const by = y - bob

  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(x, y + 10 * s, 8.5 * s, 2.8 * s, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = color
  roundedRect(ctx, bx - 8.5 * s, by - 6.5 * s, 17 * s, 13 * s, 3 * s)
  ctx.fill()

  ctx.strokeStyle = 'rgba(0,0,0,0.22)'
  ctx.lineWidth = Math.max(0.8, 1 * s)
  ctx.beginPath()
  ctx.moveTo(bx - 8.5 * s, by)
  ctx.lineTo(bx + 8.5 * s, by)
  ctx.stroke()

  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.fillRect(bx - 8.5 * s, by - 2 * s, 17 * s, 1.8 * s)

  ctx.strokeStyle = '#33302c'
  ctx.lineWidth = Math.max(1, 1.6 * s)
  ctx.beginPath()
  ctx.arc(bx, by - 6.5 * s, 3.2 * s, Math.PI, 0)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ;[[-7, -5], [7, -5], [-7, 5], [7, 5]].forEach(([dx, dy]) => {
    ctx.beginPath()
    ctx.arc(bx + dx * s, by + dy * s, 1.1 * s, 0, Math.PI * 2)
    ctx.fill()
  })
}
