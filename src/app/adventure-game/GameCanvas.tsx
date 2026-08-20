'use client'

import { useEffect, useRef } from 'react'
import { createGame, type GameHandle } from '@/lib/game/engine'
import type { CountryConfig } from '@/lib/game/types'

type Props = {
  config: CountryConfig
  startingCount: number
  paused: boolean
  onScoreChange: (score: number) => void
  onFinish: (finalScore: number) => void
}

// Drag-to-aim, one thumb: horizontal drag delta moves the launcher,
// it does not jump to the touch point (that would make aiming too
// twitchy). A/D or arrow keys give the same control on desktop.
const SENSITIVITY = 1.5
const KEY_STEP = 0.02

export default function GameCanvas({ config, startingCount, paused, onScoreChange, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const handleRef = useRef<GameHandle | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handle = createGame(canvas, config, startingCount, { onScoreChange, onFinish })
    handleRef.current = handle

    let dragging = false
    let lastX = 0

    const pointerDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      canvas.setPointerCapture(e.pointerId)
    }
    const pointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const deltaPx = e.clientX - lastX
      lastX = e.clientX
      const rect = canvas.getBoundingClientRect()
      handle.nudgeAim((deltaPx / rect.width) * SENSITIVITY)
    }
    const pointerUp = () => { dragging = false }

    canvas.addEventListener('pointerdown', pointerDown)
    window.addEventListener('pointermove', pointerMove)
    window.addEventListener('pointerup', pointerUp)

    const keys = new Set<string>()
    const keydown = (e: KeyboardEvent) => keys.add(e.key.toLowerCase())
    const keyup = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)

    let raf = 0
    const keyLoop = () => {
      if (keys.has('a') || keys.has('arrowleft')) handle.nudgeAim(-KEY_STEP)
      if (keys.has('d') || keys.has('arrowright')) handle.nudgeAim(KEY_STEP)
      raf = requestAnimationFrame(keyLoop)
    }
    raf = requestAnimationFrame(keyLoop)

    return () => {
      handle.destroy()
      canvas.removeEventListener('pointerdown', pointerDown)
      window.removeEventListener('pointermove', pointerMove)
      window.removeEventListener('pointerup', pointerUp)
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      cancelAnimationFrame(raf)
    }
    // Recreate the game only when the level itself changes — onScoreChange/
    // onFinish are stable setState-backed callbacks from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.slug])

  useEffect(() => {
    handleRef.current?.setPaused(paused)
  }, [paused])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" />
}
