'use client'

import kontra from 'kontra'
import type { CountryConfig, Encounter } from './types'
import { drawDad, drawMum, drawJax, type Reaction } from './family'
import { drawSuitcase } from './luggage'
import { sfxGate, sfxObstacle, sfxFinish, vibrate } from './sound'
import { propsFor, drawProp } from './scenery'
import { drawObstacle } from './obstacles'
import { TREE_SPRITES, drawSprite } from './sprites'

const FAR_Y = 0.2
const CROWD_Y = 0.62
const CANNON_Y = 0.87
const LANDMARK_Y = 0.1
const CROWD_RENDER_CAP = 60
const GAP_MS = 550
const TRAVEL_S = 0.22
const REACTION_MS = 650
const FINISH_MS = 1500
const FAIL_MS = 1300
const AIM_MIN = 0.1
const AIM_MAX = 0.9
// Fast, careless dragging makes the belt more likely to drop the next
// case — encourages deliberate aiming over frantic wiggling.
const FALL_CHANCE_MIN = 0.04
const FALL_CHANCE_MAX = 0.4
const FALL_CHANCE_AIM_GAIN = 5

type FloatText = { text: string; x: number; y: number; life: number; color: string }
type Tourist = { fromX: number; fromY: number; toX: number; toY: number; t: number; colorIdx: number }
type ActiveEncounter = { data: Encounter; startTime: number; resolved: boolean }
type Casualty = { x: number; y: number; vx: number; vy: number; rot: number; vrot: number; life: number; colorIdx: number }

export type GameCallbacks = {
  onScoreChange: (score: number) => void
  onFinish: (finalScore: number) => void
  onFail: () => void
}

export type GameHandle = {
  nudgeAim: (deltaFraction: number) => void
  setPaused: (paused: boolean) => void
  destroy: () => void
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

// Sunflower/phyllotaxis layout — deterministic so the crowd cluster
// never flickers frame to frame even as its size changes.
function clusterOffset(i: number) {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const r = 1.55 * Math.sqrt(i + 0.6)
  const theta = i * golden
  return { dx: r * Math.cos(theta), dy: r * Math.sin(theta) * 0.55 }
}

export function createGame(
  canvas: HTMLCanvasElement,
  config: CountryConfig,
  startingCount: number,
  callbacks: GameCallbacks
): GameHandle {
  const { clamp, lerp, GameLoop } = kontra
  const ctx = canvas.getContext('2d')!

  let W = 400
  let H = 700
  let playerX = 0.5
  let crowdCount = startingCount
  let paused = false
  let phase: 'playing' | 'finishing' | 'failed' | 'done' = 'playing'
  let finishStart = 0
  let failStart = 0
  let fireAcc = 0
  let cannonPulse = 0
  let aimSpeed = 0
  let luggageSeq = 0
  let encounterIndex = 0
  let active: ActiveEncounter | null = null
  let gapUntil = 0
  const tourists: Tourist[] = []
  const floaters: FloatText[] = []
  const casualties: Casualty[] = []
  let reaction: Reaction = 'idle'
  let reactionSince = 0

  function resize() {
    const rect = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    W = Math.max(280, rect.width)
    H = Math.max(420, rect.height)
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  const ro = new ResizeObserver(() => resize())
  if (canvas.parentElement) ro.observe(canvas.parentElement)

  function spawnEncounter() {
    if (encounterIndex >= config.encounters.length) {
      phase = 'finishing'
      finishStart = performance.now()
      sfxFinish()
      vibrate([40, 40, 80])
      return
    }
    active = { data: config.encounters[encounterIndex], startTime: performance.now(), resolved: false }
  }

  function setReaction(r: Reaction) {
    reaction = r
    reactionSince = performance.now()
  }

  function currentReaction(): Reaction {
    return performance.now() - reactionSince > REACTION_MS ? 'idle' : reaction
  }

  function resolveEncounter(enc: ActiveEncounter) {
    enc.resolved = true
    const worldX = playerX * W
    const worldY = CROWD_Y * H
    if (enc.data.type === 'gate') {
      const usesLeft = playerX < 0.5
      const choice = usesLeft ? enc.data.left : enc.data.right
      const before = crowdCount
      crowdCount = choice.kind === 'multiply' ? Math.max(1, Math.round(crowdCount * choice.value)) : crowdCount + choice.value
      const gained = crowdCount - before
      floaters.push({ text: `${choice.label}  ${gained >= 0 ? '+' : ''}${gained}`, x: worldX, y: worldY, life: 1, color: choice.kind === 'multiply' ? '#0f7a4d' : '#c17400' })
      setReaction('cheer')
      sfxGate(true)
      vibrate(20)
      callbacks.onScoreChange(crowdCount)
    } else {
      const amplitude = enc.data.moveAmplitude ?? 0
      const elapsed = performance.now() - enc.startTime
      const centerNow = amplitude ? enc.data.centerX + amplitude * Math.sin(elapsed * 0.004) : enc.data.centerX
      const half = enc.data.width / 2
      const hit = playerX > centerNow - half && playerX < centerNow + half
      if (hit) {
        const before = crowdCount
        crowdCount = Math.max(0, crowdCount - Math.max(1, Math.floor(crowdCount * enc.data.lossFraction)))
        const lost = before - crowdCount
        floaters.push({ text: `−${lost}`, x: worldX, y: worldY, life: 1, color: '#c0392b' })
        setReaction('shock')
        sfxObstacle(true)
        vibrate([30, 30, 30])
        callbacks.onScoreChange(crowdCount)

        // A visible "they actually got knocked over" moment — without
        // this, a lost traveller just silently isn't in next frame's
        // cluster, which reads as nothing happened at all.
        const shownBefore = Math.min(before, CROWD_RENDER_CAP)
        const avatarScaleNow = clamp(0.55, 1.1, 1 - shownBefore / 140)
        const spawnCount = Math.min(lost, 8)
        for (let k = 0; k < spawnCount; k++) {
          const idx = shownBefore - 1 - k
          if (idx < 3) break
          const { dx, dy } = clusterOffset(idx)
          casualties.push({
            x: worldX + dx * 13 * avatarScaleNow,
            y: worldY + dy * 13 * avatarScaleNow,
            vx: (Math.random() - 0.5) * 70,
            vy: -50 - Math.random() * 40,
            rot: 0,
            vrot: (Math.random() - 0.5) * 9,
            life: 1,
            colorIdx: idx,
          })
        }

        if (crowdCount <= 0) {
          phase = 'failed'
          failStart = performance.now()
          active = null
          return
        }
      } else {
        floaters.push({ text: 'DODGED!', x: worldX, y: worldY, life: 1, color: '#2d8163' })
        setReaction('cheer')
        sfxObstacle(false)
      }
    }
    encounterIndex += 1
    gapUntil = performance.now() + GAP_MS
    active = null
  }

  spawnEncounter()

  function update(dt: number) {
    if (paused) return
    const now = performance.now()

    if (phase === 'playing') {
      aimSpeed = Math.max(0, aimSpeed - dt * 1.4)

      fireAcc += dt * 1000
      while (fireAcc >= config.fireIntervalMs) {
        fireAcc -= config.fireIntervalMs
        cannonPulse = 1
        const beltX = playerX * W
        const beltY = CANNON_Y * H
        const fallChance = clamp(FALL_CHANCE_MIN, FALL_CHANCE_MAX, FALL_CHANCE_MIN + aimSpeed * FALL_CHANCE_AIM_GAIN)
        if (Math.random() < fallChance) {
          // Dropped right off the belt — never joins the crowd.
          casualties.push({
            x: beltX, y: beltY,
            vx: (Math.random() - 0.5) * 90,
            vy: -20 - Math.random() * 20,
            rot: 0,
            vrot: (Math.random() - 0.5) * 10,
            life: 1,
            colorIdx: luggageSeq++,
          })
          sfxObstacle(true)
        } else {
          tourists.push({ fromX: beltX, fromY: beltY, toX: beltX + (Math.random() - 0.5) * 18, toY: CROWD_Y * H, t: 0, colorIdx: luggageSeq++ })
        }
      }

      for (let i = tourists.length - 1; i >= 0; i--) {
        tourists[i].t += dt / TRAVEL_S
        if (tourists[i].t >= 1) {
          tourists.splice(i, 1)
          crowdCount += 1
          callbacks.onScoreChange(crowdCount)
        }
      }

      if (active && !active.resolved && now - active.startTime >= config.approachMs) {
        resolveEncounter(active)
      } else if (!active && now >= gapUntil) {
        spawnEncounter()
      }
    } else if (phase === 'finishing') {
      if (now - finishStart >= FINISH_MS) {
        phase = 'done'
        callbacks.onFinish(crowdCount)
      }
    } else if (phase === 'failed') {
      if (now - failStart >= FAIL_MS) {
        phase = 'done'
        callbacks.onFail()
      }
    }

    cannonPulse = Math.max(0, cannonPulse - dt * 3)
    for (let i = floaters.length - 1; i >= 0; i--) {
      floaters[i].life -= dt / 0.9
      floaters[i].y -= dt * 26
      if (floaters[i].life <= 0) floaters.splice(i, 1)
    }
    for (let i = casualties.length - 1; i >= 0; i--) {
      const c = casualties[i]
      c.vy += dt * 220
      c.x += c.vx * dt
      c.y += c.vy * dt
      c.rot += c.vrot * dt
      c.life -= dt / 0.85
      if (c.life <= 0) casualties.splice(i, 1)
    }
  }

  // Perspective half-width of the road/bridge at a given fraction of
  // canvas height — shared by the road, the roadside scenery and the
  // gate/obstacle sizing so everything agrees on the same vanishing
  // point instead of drifting apart.
  function roadHalfWidthAt(yFrac: number) {
    const farHalf = W * 0.22
    const nearHalf = W * 0.62
    const t = clamp(0, 1, (yFrac - FAR_Y) / (CANNON_Y - FAR_Y))
    return lerp(farHalf, nearHalf, t)
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, config.theme.skyTop)
    g.addColorStop(1, config.theme.skyBottom)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    const clouds: [number, number, number][] = [[0.18, 0.09, 1], [0.72, 0.15, 0.8], [0.4, 0.05, 0.6]]
    for (const [fx, fy, cs] of clouds) {
      const cx = fx * W
      const cy = fy * H
      for (const [dx, r] of [[-14, 12], [0, 16], [16, 11], [30, 9]] as [number, number][]) {
        ctx.beginPath()
        ctx.ellipse(cx + dx * cs, cy, r * cs, r * 0.6 * cs, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  function drawRoad() {
    const farHalf = roadHalfWidthAt(FAR_Y)
    const nearHalf = roadHalfWidthAt(CANNON_Y)
    const farY = FAR_Y * H
    const nearY = CANNON_Y * H + 40
    ctx.fillStyle = config.theme.ground
    ctx.fillRect(0, 0, W, H)

    // water either side of the raised road, a nod to the reference
    // art's river-flanked bridge
    ctx.fillStyle = 'rgba(70,140,190,0.35)'
    ctx.fillRect(0, farY - 10, W, nearY - farY + 20)

    ctx.fillStyle = config.theme.road
    ctx.beginPath()
    ctx.moveTo(W / 2 - farHalf, farY)
    ctx.lineTo(W / 2 + farHalf, farY)
    ctx.lineTo(W / 2 + nearHalf, nearY)
    ctx.lineTo(W / 2 - nearHalf, nearY)
    ctx.closePath()
    ctx.fill()

    // rungs across the road, denser near the camera for a perspective cue
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 2
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      const y = lerp(farY, nearY, t * t)
      const half = roadHalfWidthAt(lerp(FAR_Y, CANNON_Y, t * t))
      ctx.beginPath()
      ctx.moveTo(W / 2 - half, y)
      ctx.lineTo(W / 2 + half, y)
      ctx.stroke()
    }
    // centre line
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 2.5
    ctx.setLineDash([10, 14])
    ctx.beginPath()
    ctx.moveTo(W / 2, farY)
    ctx.lineTo(W / 2, nearY)
    ctx.stroke()
    ctx.setLineDash([])

    // low stone-post railings along both edges
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      const y = lerp(farY, nearY, t * t)
      const half = roadHalfWidthAt(lerp(FAR_Y, CANNON_Y, t * t))
      const postR = lerp(2, 5, t)
      ctx.beginPath()
      ctx.arc(W / 2 - half - postR, y, postR, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(W / 2 + half + postR, y, postR, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function drawScenery() {
    const kinds = propsFor(config.slug)
    // Twice the bands of the original pass, alternating hand-drawn
    // cultural landmarks (torii/pagoda/stupa/etc, nothing generic
    // covers those) with real tree sprites, for a noticeably busier
    // roadside than a handful of sparse props.
    const bands: [number, number][] = [
      [0.26, 0], [0.3, 1], [0.36, 0], [0.42, 1],
      [0.48, 0], [0.54, 1], [0.6, 0], [0.66, 1],
      [0.72, 0], [0.78, 1],
    ]
    bands.forEach(([yFrac, side], i) => {
      const y = yFrac * H
      const half = roadHalfWidthAt(yFrac)
      const scale = lerp(0.5, 1.2, clamp(0, 1, (yFrac - FAR_Y) / (CANNON_Y - FAR_Y)))
      const dir = side === 0 ? -1 : 1
      const x = W / 2 + dir * (half + 16 * scale)
      if (i % 2 === 0) {
        drawProp(ctx, kinds[Math.floor(i / 2) % kinds.length], x, y, scale)
      } else {
        const tree = i % 4 === 1 ? TREE_SPRITES.green : TREE_SPRITES.autumn
        drawSprite(ctx, tree, x, y - 10 * scale, 28 * scale, 28 * scale)
      }
    })
  }

  function drawLandmark() {
    const y = LANDMARK_Y * H
    const glow = ctx.createRadialGradient(W / 2, y, 4, W / 2, y, H * 0.14)
    glow.addColorStop(0, 'rgba(255,255,255,0.55)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(W / 2, y, H * 0.14, 0, Math.PI * 2)
    ctx.fill()

    ctx.font = `${Math.round(H * 0.1)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(config.landmarkEmoji, W / 2, y)

    const labelY = y + H * 0.085
    ctx.font = `700 ${Math.round(H * 0.022)}px system-ui, sans-serif`
    const labelW = ctx.measureText(config.landmarkLabel).width + 24
    ctx.fillStyle = 'rgba(20,20,20,0.55)'
    roundedRectPath(ctx, W / 2 - labelW / 2, labelY - H * 0.02, labelW, H * 0.04, H * 0.02)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(config.landmarkLabel, W / 2, labelY)
  }

  function glossyPanel(x: number, y: number, w: number, h: number, color: string, r: number) {
    roundedRectPath(ctx, x, y, w, h, r)
    ctx.fillStyle = color
    ctx.fill()
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, 'rgba(255,255,255,0.35)')
    g.addColorStop(0.5, 'rgba(255,255,255,0)')
    roundedRectPath(ctx, x, y, w, h * 0.5, r)
    ctx.fillStyle = g
    ctx.fill()
    roundedRectPath(ctx, x, y, w, h, r)
    ctx.lineWidth = Math.max(1.5, h * 0.05)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.stroke()
  }

  function drawEncounter() {
    if (!active) return
    const now = performance.now()
    const t = clamp(0, 1, (now - active.startTime) / config.approachMs)
    const worldY = lerp(FAR_Y * H, CROWD_Y * H, t)
    const persp = lerp(0.4, 1, t)
    const spawnPop = clamp(0, 1, t / 0.12)
    const roadHalf = roadHalfWidthAt(lerp(FAR_Y, CROWD_Y, t))

    if (active.data.type === 'gate') {
      const { left, right } = active.data
      const gateH = 48 * persp * spawnPop
      const gap = 4
      const panelW = roadHalf - gap / 2
      const icon = (k: 'multiply' | 'add') => (k === 'multiply' ? '✕' : '➕')
      const colFor = (k: 'multiply' | 'add') => (k === 'multiply' ? '#1f9d6b' : '#e0782e')
      const darkFor = (k: 'multiply' | 'add') => (k === 'multiply' ? '#0f6d47' : '#a85417')

      glossyPanel(W / 2 - roadHalf, worldY - gateH / 2, panelW, gateH, colFor(left.kind), gateH * 0.28)
      glossyPanel(W / 2 + gap / 2, worldY - gateH / 2, panelW, gateH, colFor(right.kind), gateH * 0.28)

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle';
      [{ choice: left, cx: W / 2 - roadHalf / 2 }, { choice: right, cx: W / 2 + roadHalf / 2 }].forEach(({ choice, cx }) => {
        ctx.fillStyle = 'rgba(0,0,0,0.28)'
        ctx.font = `${Math.round(gateH * 0.42)}px system-ui, sans-serif`
        ctx.fillText(icon(choice.kind), cx - panelW * 0.28, worldY)
        ctx.fillStyle = darkFor(choice.kind)
        ctx.font = `900 ${Math.round(gateH * 0.5)}px system-ui, sans-serif`
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.strokeText(choice.label, cx + panelW * 0.08, worldY)
        ctx.fillStyle = '#fff'
        ctx.fillText(choice.label, cx + panelW * 0.08, worldY)
      })
    } else {
      const amplitude = active.data.moveAmplitude ?? 0
      const elapsed = now - active.startTime
      const centerNow = amplitude ? active.data.centerX + amplitude * Math.sin(elapsed * 0.004) : active.data.centerX
      const w = active.data.width * W * persp * spawnPop
      const h = 40 * persp * spawnPop
      const cx = centerNow * W
      drawObstacle(ctx, active.data.label, cx, worldY, w, h)
      ctx.fillStyle = '#fff'
      ctx.font = `700 ${Math.round(h * 0.45)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.strokeText(active.data.label, cx, worldY - h / 2 - 6)
      ctx.fillText(active.data.label, cx, worldY - h / 2 - 6)
    }
  }

  function drawConveyor(offsetY: number) {
    const x = playerX * W
    const y = CANNON_Y * H + offsetY
    const pulse = 1 + cannonPulse * 0.22

    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(x, y + 15, 34, 8, 0, 0, Math.PI * 2)
    ctx.fill()

    // belt frame
    ctx.fillStyle = '#4a4f57'
    roundedRectPath(ctx, x - 32, y - 9, 64, 20, 9)
    ctx.fill()

    // moving tread, chevrons scroll to sell "conveyor belt"
    ctx.save()
    roundedRectPath(ctx, x - 29, y - 6, 58, 14, 6)
    ctx.clip()
    ctx.fillStyle = '#8a8f99'
    ctx.fillRect(x - 29, y - 6, 58, 14)
    const scroll = (performance.now() * 0.05) % 16
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    for (let sx = -40; sx < 40; sx += 16) {
      ctx.beginPath()
      ctx.moveTo(x + sx + scroll, y - 6)
      ctx.lineTo(x + sx + scroll + 6, y - 6)
      ctx.lineTo(x + sx + scroll - 2, y + 8)
      ctx.lineTo(x + sx + scroll - 8, y + 8)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()

    // end rollers
    ctx.fillStyle = '#2e3238'
    ctx.beginPath()
    ctx.arc(x - 30, y, 10 * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + 30, y, 10 * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = config.theme.accent
    ctx.beginPath()
    ctx.arc(x - 30, y, 4 * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + 30, y, 4 * pulse, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawCrowd(offsetY: number) {
    const cx = playerX * W
    const cy = CROWD_Y * H + offsetY
    const r = currentReaction()
    const wobble = performance.now() * 0.006
    const shown = Math.min(crowdCount, CROWD_RENDER_CAP)
    const avatarScale = clamp(0.55, 1.1, 1 - shown / 140)
    for (let i = shown - 1; i >= 0; i--) {
      const { dx, dy } = clusterOffset(i)
      const x = cx + dx * 13 * avatarScale
      const y = cy + dy * 13 * avatarScale
      if (i === 0) drawDad({ ctx, x, y, scale: avatarScale * 1.15, reaction: r, wobble })
      else if (i === 1) drawMum({ ctx, x, y, scale: avatarScale * 1.1, reaction: r, wobble })
      else if (i === 2) drawJax({ ctx, x, y, scale: avatarScale, reaction: r, wobble })
      else drawSuitcase(ctx, x, y, avatarScale, i, wobble, r === 'shock' ? 'shock' : 'idle')
    }
    if (crowdCount > CROWD_RENDER_CAP) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.font = '700 13px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`+${crowdCount - CROWD_RENDER_CAP} more`, cx, cy - 46 * avatarScale)
    }
  }

  function drawCasualties() {
    for (const c of casualties) {
      ctx.save()
      ctx.globalAlpha = clamp(0, 1, c.life)
      ctx.translate(c.x, c.y)
      ctx.rotate(c.rot)
      drawSuitcase(ctx, 0, 0, 0.85, c.colorIdx, 0, 'shock')
      ctx.restore()
    }
  }

  function drawTourists() {
    for (const p of tourists) {
      const x = lerp(p.fromX, p.toX, p.t)
      const y = lerp(p.fromY, p.toY, p.t)
      drawSuitcase(ctx, x, y, 0.6, p.colorIdx, 0, 'idle')
    }
  }

  function drawFloaters() {
    for (const f of floaters) {
      ctx.globalAlpha = clamp(0, 1, f.life)
      ctx.fillStyle = f.color
      ctx.font = '800 20px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(f.text, f.x, f.y)
      ctx.globalAlpha = 1
    }
  }

  function render() {
    drawSky()
    drawRoad()
    drawScenery()
    drawLandmark()
    let offsetY = 0
    if (phase === 'finishing') {
      const t = clamp(0, 1, (performance.now() - finishStart) / FINISH_MS)
      offsetY = -t * H * 0.55
      drawCrowd(offsetY)
      ctx.fillStyle = `rgba(255,255,255,${t * 0.4})`
      ctx.fillRect(0, 0, W, H)
      return
    }
    if (phase === 'failed') {
      const t = clamp(0, 1, (performance.now() - failStart) / FAIL_MS)
      drawCasualties()
      ctx.fillStyle = `rgba(70,20,20,${t * 0.5})`
      ctx.fillRect(0, 0, W, H)
      return
    }
    drawEncounter()
    drawCrowd(0)
    drawCasualties()
    drawConveyor(0)
    drawTourists()
    drawFloaters()
  }

  const loop = GameLoop({ update, render, context: ctx })
  loop.start()

  return {
    nudgeAim(delta: number) {
      playerX = clamp(AIM_MIN, AIM_MAX, playerX + delta)
      aimSpeed = Math.min(1, aimSpeed + Math.abs(delta) * 3)
    },
    setPaused(p: boolean) {
      paused = p
    },
    destroy() {
      loop.stop()
      ro.disconnect()
    },
  }
}
