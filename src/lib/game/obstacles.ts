// Obstacle rendering — simple flat vehicle/barrier silhouettes
// instead of a plain hazard-stripe box, matching the reference art's
// "traffic on the road" look without needing image assets.

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

function drawWheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function drawVan(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, bodyColor: string) {
  const bw = w * 0.62
  const bh = h
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + bh * 0.55, bw * 0.6, bh * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = bodyColor
  roundedRect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, bh * 0.22)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  roundedRect(ctx, cx - bw * 0.3, cy - bh * 0.42, bw * 0.5, bh * 0.32, bh * 0.1)
  ctx.fill()
  drawWheel(ctx, cx - bw * 0.32, cy + bh * 0.42, bh * 0.18)
  drawWheel(ctx, cx + bw * 0.32, cy + bh * 0.42, bh * 0.18)
}

function drawTukTuk(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  const bw = w * 0.5
  const bh = h
  ctx.fillStyle = '#f2c744'
  roundedRect(ctx, cx - bw / 2, cy - bh * 0.15, bw, bh * 0.55, bh * 0.15)
  ctx.fill()
  ctx.fillStyle = '#2d8163'
  ctx.beginPath()
  ctx.moveTo(cx - bw * 0.55, cy - bh * 0.15)
  ctx.quadraticCurveTo(cx, cy - bh * 0.55, cx + bw * 0.55, cy - bh * 0.15)
  ctx.fill()
  drawWheel(ctx, cx - bw * 0.3, cy + bh * 0.38, bh * 0.16)
  drawWheel(ctx, cx + bw * 0.3, cy + bh * 0.38, bh * 0.16)
}

function drawScooterRider(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  const s = h / 30
  ctx.fillStyle = '#dd8a3c'
  roundedRect(ctx, cx - 6 * s, cy - 2 * s, 12 * s, 14 * s, 4 * s)
  ctx.fill()
  ctx.fillStyle = '#e3b78d'
  ctx.beginPath()
  ctx.arc(cx, cy - 8 * s, 5 * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2b2b2f'
  roundedRect(ctx, cx - 10 * s, cy + 10 * s, 20 * s, 4 * s, 2 * s)
  ctx.fill()
  drawWheel(ctx, cx - 8 * s, cy + 14 * s, 3.6 * s)
  drawWheel(ctx, cx + 8 * s, cy + 14 * s, 3.6 * s)
  void w
}

function drawBarrier(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  ctx.save()
  const path = new Path2D()
  path.rect(cx - w / 2, cy - h / 2, w, h)
  ctx.clip(path)
  ctx.fillStyle = '#b23b2e'
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h)
  ctx.fillStyle = '#f2c744'
  const stripe = h * 0.42
  for (let sx = -w; sx < w * 2; sx += stripe * 2) {
    ctx.beginPath()
    ctx.moveTo(cx - w / 2 + sx, cy + h / 2)
    ctx.lineTo(cx - w / 2 + sx + h, cy - h / 2)
    ctx.lineTo(cx - w / 2 + sx + h + stripe, cy - h / 2)
    ctx.lineTo(cx - w / 2 + sx + stripe, cy + h / 2)
    ctx.fill()
  }
  ctx.restore()
}

export function drawObstacle(ctx: CanvasRenderingContext2D, label: string, cx: number, cy: number, w: number, h: number) {
  const l = label.toLowerCase()
  if (l.includes('tuk')) drawTukTuk(ctx, cx, cy, w, h)
  else if (l.includes('scooter')) drawScooterRider(ctx, cx, cy, w, h)
  else if (l.includes('traffic') || l.includes('cart') || l.includes('construction')) drawVan(ctx, cx, cy, w, h, l.includes('construction') ? '#f2a340' : '#4a90c2')
  else drawBarrier(ctx, cx, cy, w, h)
}
