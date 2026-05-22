'use client'

// Wraps a stamp graphic so that tapping it opens the StampDetailModal
// with the right title/description/note for that stamp.
//
// Two variants in one component (discriminated union):
// - kind 'row'       : a stored stamp row (system or CUSTOM)
// - kind 'milestone' : a derived milestone badge (computed, not in DB)

import { useState } from 'react'
import { PassportStampFromRow } from './PassportStamp'
import MilestoneStamp from './MilestoneStamp'
import StampDetailModal from './StampDetailModal'
import { STAMP_META, type StampType } from '@/lib/passport-types'
import type { StampShape } from '@/lib/passport-milestones'

type RowLike = {
  type: StampType
  custom_label: string | null
  custom_emoji: string | null
  custom_shape: string | null
  custom_ink: string | null
  note: string | null
}

type CommonProps = {
  size?: 'sm' | 'md'
}

type RowVariant = CommonProps & {
  kind: 'row'
  row: RowLike
  country?: string | null
  date?: string | null
}

type MilestoneVariant = CommonProps & {
  kind: 'milestone'
  milestone: {
    id: string
    label: string
    description: string
    emoji: string
    ink: string
    shape: StampShape
    earnedAt: string | null
  }
}

type Props = RowVariant | MilestoneVariant

export default function TappableStamp(props: Props) {
  const [open, setOpen] = useState(false)

  const graphic = props.kind === 'row'
    ? <PassportStampFromRow
        row={props.row}
        country={props.country}
        date={props.date}
        size={props.size}
      />
    : <MilestoneStamp
        label={props.milestone.label}
        emoji={props.milestone.emoji}
        ink={props.milestone.ink}
        shape={props.milestone.shape}
        date={props.milestone.earnedAt}
        size={props.size}
        rotate={0}
      />

  // Title + description + note resolved from whichever variant.
  let title: string
  let description: string
  let date: string | null
  let country: string | null
  let note: string | null
  if (props.kind === 'row') {
    if (props.row.type === 'CUSTOM') {
      title = props.row.custom_label ?? 'Custom stamp'
      description = props.row.note ?? 'A one-off stamp made just for this moment.'
      note = null // custom stamps put their parent message in the description already
    } else {
      const meta = STAMP_META[props.row.type]
      title = meta.label
      description = meta.description
      note = props.row.note
    }
    date = props.date ?? null
    country = props.country ?? null
  } else {
    title = props.milestone.label
    description = props.milestone.description
    note = null
    date = props.milestone.earnedAt
    country = null
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="appearance-none border-0 p-0 bg-transparent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-md"
        aria-label={`${title}, tap for details`}
      >
        {graphic}
      </button>
      {open && (
        <StampDetailModal
          title={title}
          description={description}
          date={date}
          country={country}
          note={note}
          graphic={graphic}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
