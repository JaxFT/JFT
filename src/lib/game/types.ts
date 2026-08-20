// Shared types for "Get the Family There!" — the Adventure Game.
// See src/lib/game/countries.ts for the actual level data.

export type GateChoice = {
  kind: 'multiply' | 'add'
  value: number
  label: string
}

export type GateEncounter = {
  type: 'gate'
  left: GateChoice
  right: GateChoice
}

export type ObstacleEncounter = {
  type: 'obstacle'
  // Fraction of canvas width the danger zone spans, centred on centerX.
  width: number
  centerX: number
  // If set, the obstacle's centerX oscillates +/- this fraction of
  // canvas width over the course of its approach — a "moving obstacle".
  moveAmplitude?: number
  lossFraction: number
  label: string
}

export type Encounter = GateEncounter | ObstacleEncounter

export type CountryTheme = {
  skyTop: string
  skyBottom: string
  ground: string
  road: string
  accent: string
}

export type CountryConfig = {
  slug: string
  name: string
  flag: string
  iso2: string
  order: number
  theme: CountryTheme
  landmarkEmoji: string
  landmarkLabel: string
  fireIntervalMs: number
  approachMs: number
  encounters: Encounter[]
}

export type CountryProgress = {
  bestScore: number
  unlocked: boolean
  passportStamp: boolean
}

export type GameProgress = Record<string, CountryProgress>
