// Obstacle rendering — real top-down vehicle/object sprites (see
// sprites.ts) instead of a flat hazard-stripe box.

import { drawSprite, VEHICLE_SPRITES, OBJECT_SPRITES } from './sprites'

function pick(label: string): { img: HTMLImageElement; aspect: number } {
  const l = label.toLowerCase()
  if (l.includes('tuk')) return { img: VEHICLE_SPRITES.yellow, aspect: 0.72 }
  if (l.includes('scooter')) return { img: VEHICLE_SPRITES.blue, aspect: 0.72 }
  if (l.includes('traffic') || l.includes('cart')) return { img: VEHICLE_SPRITES.red, aspect: 0.72 }
  if (l.includes('construction')) return { img: VEHICLE_SPRITES.yellow, aspect: 0.72 }
  if (l.includes('rolling') || l.includes('barrier')) return { img: OBJECT_SPRITES.barrierRed, aspect: 1.8 }
  if (l.includes('puddle') || l.includes('rock')) return { img: OBJECT_SPRITES.rock1, aspect: 1 }
  return { img: OBJECT_SPRITES.barrelRed, aspect: 0.7 }
}

export function drawObstacle(ctx: CanvasRenderingContext2D, label: string, cx: number, cy: number, w: number, h: number) {
  const { img, aspect } = pick(label)
  ctx.fillStyle = 'rgba(0,0,0,0.16)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + h * 0.32, w * 0.4, h * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  const drawW = Math.min(w, h / aspect)
  const drawH = drawW * aspect
  drawSprite(ctx, img, cx, cy, drawW, drawH)
}
