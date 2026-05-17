'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronLeft, ChevronRight, Crown } from 'lucide-react'

type StackPost = {
  slug: string
  title: string
  excerpt: string
  coverImage?: string | null
  isPremium: boolean
}

const SLOTS = [
  { right: 160, top: 0,  rotate: -3, z: 3 },
  { right: 80,  top: 24, rotate:  0, z: 2 },
  { right: 0,   top: 48, rotate:  3, z: 1 },
]

const SWIPE_THRESHOLD = 80
const CLICK_MAX_MOVE = 6

export default function HeroBlogStack({ posts }: { posts: StackPost[] }) {
  const router = useRouter()
  const [order, setOrder] = useState<number[]>(() => posts.map((_, i) => i))
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null)
  const [flying, setFlying] = useState<{ postIdx: number; dx: number; dy: number } | null>(null)
  const startRef = useRef<{ x: number; y: number; moved: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (flying) return
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = { x: e.clientX, y: e.clientY, moved: 0 }
    setDrag({ dx: 0, dy: 0 })
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    start.moved = Math.max(start.moved, Math.hypot(dx, dy))
    setDrag({ dx, dy })
  }

  const cycle = (dir: 1 | -1) => {
    if (flying) return
    const frontPostIdx = order[0]
    setDrag(null)
    setFlying({ postIdx: frontPostIdx, dx: dir * 1200, dy: 0 })
    window.setTimeout(() => {
      setOrder(prev => [...prev.slice(1), prev[0]])
      setFlying(null)
    }, 350)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    startRef.current = null
    if (!start) {
      setDrag(null)
      return
    }
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y

    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const flyDir: 1 | -1 = dx > 0 ? 1 : -1
      const frontPostIdx = order[0]
      setDrag(null)
      setFlying({ postIdx: frontPostIdx, dx: flyDir * 1200, dy: dy * 3 })
      window.setTimeout(() => {
        setOrder(prev => [...prev.slice(1), prev[0]])
        setFlying(null)
      }, 350)
      return
    }

    setDrag(null)

    if (start.moved < CLICK_MAX_MOVE) {
      router.push(`/blog/${posts[order[0]].slug}`)
    }
  }

  return (
    <div className="relative">
      <div className="relative h-96">
        {order.map((postIdx, slotIdx) => {
          if (slotIdx >= SLOTS.length) return null
          const slot = SLOTS[slotIdx]
          const post = posts[postIdx]
          const isFront = slotIdx === 0
          const isFlying = flying?.postIdx === postIdx

          let transform = `rotate(${slot.rotate}deg)`
          if (isFlying && flying) {
            const tilt = flying.dx > 0 ? 25 : -25
            transform = `translate(${flying.dx}px, ${flying.dy}px) rotate(${slot.rotate + tilt}deg)`
          } else if (isFront && drag) {
            const tiltExtra = drag.dx / 20
            transform = `translate(${drag.dx}px, ${drag.dy}px) rotate(${slot.rotate + tiltExtra}deg)`
          }

          const transition =
            isFront && drag
              ? 'none'
              : 'transform 350ms cubic-bezier(.2,.8,.2,1), top 350ms cubic-bezier(.2,.8,.2,1), right 350ms cubic-bezier(.2,.8,.2,1)'

          return (
            <div
              key={post.slug}
              className={`absolute bg-white rounded-2xl overflow-hidden shadow-2xl w-56 select-none ${
                isFront ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
              style={{
                right: slot.right,
                top: slot.top,
                zIndex: isFlying ? 100 : slot.z,
                transform,
                transition,
                touchAction: isFront ? 'none' : 'auto',
                pointerEvents: isFront && !flying ? 'auto' : 'none',
              }}
              onPointerDown={isFront ? onPointerDown : undefined}
              onPointerMove={isFront ? onPointerMove : undefined}
              onPointerUp={isFront ? onPointerUp : undefined}
              onPointerCancel={isFront ? onPointerUp : undefined}
            >
              {post.coverImage && (
                <img
                  src={post.coverImage}
                  alt={post.title}
                  draggable={false}
                  className="w-full h-36 object-cover pointer-events-none"
                />
              )}
              <div className="p-3">
                <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{post.title}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.excerpt}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
                    Read More <ArrowRight className="w-3 h-3" />
                  </span>
                  {post.isPremium && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" /> Premium
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {posts.length > 1 && (
        <div className="absolute right-0 -bottom-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => cycle(-1)}
            aria-label="Previous post"
            className="p-1 text-white/50 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => cycle(1)}
            aria-label="Next post"
            className="p-1 text-white/50 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
