'use client'

// Single-instance modal manager for tappable stamps.
//
// Why a context instead of per-stamp local state:
// 1. Lots of stamps on a page; we want only ONE modal open at a
//    time. Clicking a different stamp should swap the modal
//    contents, not stack a second modal on top.
// 2. Each stamp graphic on the Global Stamps page is wrapped in a
//    rotating <div style="transform: ..."> which creates a new
//    containing block for fixed-positioned descendants. A modal
//    rendered inside that wrapper renders relative to the wrapper
//    (squashed and offset), not the viewport. The single modal
//    lives at the provider level, outside the transforms, so its
//    "fixed inset-0" actually fills the screen.

import { createContext, useContext, useState, type ReactNode } from 'react'
import StampDetailModal from './StampDetailModal'

type ModalContent = {
  title: string
  description: string
  date: string | null
  country: string | null
  note: string | null
  graphic: ReactNode
}

type Ctx = {
  open: (content: ModalContent) => void
  close: () => void
}

const StampModalCtx = createContext<Ctx | null>(null)

export function useStampModal(): Ctx {
  const v = useContext(StampModalCtx)
  if (!v) throw new Error('useStampModal must be used inside <StampModalProvider>')
  return v
}

export function StampModalProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ModalContent | null>(null)

  // setContent on every open call — clicking a different stamp
  // while one is open just swaps content, doesn't stack.
  const open = (c: ModalContent) => setContent(c)
  const close = () => setContent(null)

  return (
    <StampModalCtx.Provider value={{ open, close }}>
      {children}
      {content && (
        <StampDetailModal
          title={content.title}
          description={content.description}
          date={content.date}
          country={content.country}
          note={content.note}
          graphic={content.graphic}
          onClose={close}
        />
      )}
    </StampModalCtx.Provider>
  )
}
