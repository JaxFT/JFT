import { Lightbulb, Tag, AlertTriangle, Heart } from 'lucide-react'

export type CalloutKind = 'tip' | 'discount' | 'avoid' | 'take'

const CONFIG: Record<CalloutKind, { icon: React.ReactNode; label: string; bg: string; border: string; text: string; iconText: string }> = {
  tip:      { icon: <Lightbulb className="w-4 h-4" />,      label: 'Pro tip',      bg: 'bg-brand-50',   border: 'border-brand-200',   text: 'text-brand-900',   iconText: 'text-brand-700' },
  discount: { icon: <Tag className="w-4 h-4" />,            label: 'Discount',     bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-900',   iconText: 'text-amber-700' },
  avoid:    { icon: <AlertTriangle className="w-4 h-4" />,  label: 'Avoid',        bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-900',     iconText: 'text-red-700' },
  take:     { icon: <Heart className="w-4 h-4" />,          label: 'Honest take',  bg: 'bg-sand-100',   border: 'border-sand-200',    text: 'text-gray-800',    iconText: 'text-brand-700' },
}

export function Callout({ kind, children }: { kind: CalloutKind; children: React.ReactNode }) {
  const c = CONFIG[kind]
  return (
    <div className={`my-5 rounded-xl border ${c.border} ${c.bg} ${c.text} px-4 py-3 flex gap-3`}>
      <div className={`${c.iconText} mt-0.5 shrink-0`}>{c.icon}</div>
      <div className="flex-1 leading-relaxed">
        <p className={`text-xs font-bold tracking-widest uppercase ${c.iconText} mb-1`}>{c.label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}

// Detect a callout token at the START of a paragraph's plain text.
// Returns the kind and the remaining text (token stripped) if matched.
export function detectCalloutFromText(text: string): { kind: CalloutKind; rest: string } | null {
  const m = text.match(/^\s*(PRO TIP|DISCOUNT|AVOID|HONEST TAKE)\s*:\s*([\s\S]*)$/i)
  if (!m) return null
  const tokenRaw = m[1].toUpperCase()
  const kind: CalloutKind =
    tokenRaw === 'PRO TIP'      ? 'tip'      :
    tokenRaw === 'DISCOUNT'     ? 'discount' :
    tokenRaw === 'AVOID'        ? 'avoid'    :
    /* HONEST TAKE */             'take'
  return { kind, rest: m[2] }
}
