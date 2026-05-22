// Thin wrapper that forwards milestone data into PassportStamp.
// Milestones are computed at render time (not stored in the DB), so
// they don't have a StampType — they have free-form label/emoji/ink
// from passport-milestones.ts. PassportStamp's overrides path handles
// that directly, so this component exists only to keep call sites
// readable ("MilestoneStamp" reads better than passing 5 props to
// PassportStamp at every callsite).

import PassportStamp from './PassportStamp'
import type { StampShape } from '@/lib/passport-milestones'

type Props = {
  emoji: string
  label: string
  ink: string
  date?: string | null
  size?: 'sm' | 'md'
  rotate?: number
  shape?: StampShape
}

export default function MilestoneStamp({ emoji, label, ink, date, size, rotate, shape }: Props) {
  return (
    <PassportStamp
      label={label}
      emoji={emoji}
      ink={ink}
      shape={shape}
      date={date}
      size={size}
      rotate={rotate}
    />
  )
}
