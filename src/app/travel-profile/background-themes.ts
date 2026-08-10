// Curated background palette for the Travel Profile hero. A picker of
// preset gradients rather than a free hex input — every option is
// deliberately saturated/dark enough that white text stays legible on
// it, so "pick your colour" can never produce an illegible page.
// Shared between the editor's swatch picker and the public page's
// rendering, so there's one source of truth for what each id means.

export type BackgroundThemeId = 'brand' | 'sunset' | 'ocean' | 'forest' | 'dusk' | 'sand'

export type BackgroundTheme = {
  id: BackgroundThemeId
  label: string
  swatch: string   // small CSS gradient, for the picker button itself
  gradient: string // full CSS gradient, for the actual hero background
}

export const BACKGROUND_THEMES: Record<BackgroundThemeId, BackgroundTheme> = {
  brand:  { id: 'brand',  label: 'Brand',  swatch: 'linear-gradient(135deg,#1e40af,#2d8163)', gradient: 'linear-gradient(160deg, #1e40af 0%, #2d8163 100%)' },
  sunset: { id: 'sunset', label: 'Sunset', swatch: 'linear-gradient(135deg,#f97316,#db2777)', gradient: 'linear-gradient(160deg, #f97316 0%, #db2777 100%)' },
  ocean:  { id: 'ocean',  label: 'Ocean',  swatch: 'linear-gradient(135deg,#0ea5e9,#0f172a)', gradient: 'linear-gradient(160deg, #0ea5e9 0%, #0f172a 100%)' },
  forest: { id: 'forest', label: 'Forest', swatch: 'linear-gradient(135deg,#16a34a,#14532d)', gradient: 'linear-gradient(160deg, #16a34a 0%, #14532d 100%)' },
  dusk:   { id: 'dusk',   label: 'Dusk',   swatch: 'linear-gradient(135deg,#7c3aed,#1e1b4b)', gradient: 'linear-gradient(160deg, #7c3aed 0%, #1e1b4b 100%)' },
  sand:   { id: 'sand',   label: 'Sand',   swatch: 'linear-gradient(135deg,#d97706,#78350f)', gradient: 'linear-gradient(160deg, #d97706 0%, #78350f 100%)' },
}

export const BACKGROUND_THEME_ORDER: BackgroundThemeId[] = ['brand', 'sunset', 'ocean', 'forest', 'dusk', 'sand']

export function isValidBackgroundTheme(v: unknown): v is BackgroundThemeId {
  return typeof v === 'string' && v in BACKGROUND_THEMES
}
