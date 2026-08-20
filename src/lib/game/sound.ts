// Tiny WebAudio synth for the Adventure Game — no audio files, no
// copyrighted music, just short generated blips. Optional and muted
// by default state is read from localStorage so the preference
// survives between visits.

const MUTE_KEY = 'jft_game_muted'

let audioCtx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!audioCtx) audioCtx = new AC()
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(MUTE_KEY) === '1'
}

export function setMuted(muted: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
}

function beep(opts: { freq: number; duration: number; type?: OscillatorType; gain?: number; glideTo?: number }) {
  if (isMuted()) return
  const ctx = getCtx()
  if (!ctx) return
  const { freq, duration, type = 'sine', gain = 0.15, glideTo } = opts
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), ctx.currentTime + duration)
  g.gain.setValueAtTime(gain, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

export function sfxFire() {
  beep({ freq: 520, duration: 0.05, type: 'square', gain: 0.05 })
}
export function sfxGate(isGood: boolean) {
  beep({ freq: 320, duration: 0.2, type: 'triangle', gain: 0.18, glideTo: isGood ? 920 : 500 })
}
export function sfxObstacle(hit: boolean) {
  if (hit) beep({ freq: 200, duration: 0.25, type: 'sawtooth', gain: 0.16, glideTo: 70 })
  else beep({ freq: 500, duration: 0.15, type: 'triangle', gain: 0.14, glideTo: 800 })
}
export function sfxFinish() {
  beep({ freq: 440, duration: 0.55, type: 'sine', gain: 0.2, glideTo: 900 })
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern) } catch {}
  }
}
