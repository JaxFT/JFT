// Teal card at the bottom of relevant sections. A specific photo
// suggestion for that pack, always ending with the Instagram tag.
// Mostly content-driven by the parent; this component just provides
// the visual treatment.

import { Camera, Instagram } from 'lucide-react'

export default function PhotoPrompt({ prompt }: { prompt: string }) {
  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-4 flex items-start gap-3 text-sm text-teal-900">
      <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
        <Camera className="w-4 h-4 text-teal-700" />
      </div>
      <div>
        <p className="font-semibold mb-1">Snap it</p>
        <p className="leading-relaxed">{prompt}</p>
        <p className="mt-2 text-xs inline-flex items-center gap-1 text-teal-700">
          <Instagram className="w-3 h-3" /> Share with @jax.familytravels
        </p>
      </div>
    </div>
  )
}
