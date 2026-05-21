'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import CallRequestModal from './CallRequestModal'

type Props = {
  // null when signed out; we redirect to /login on click in that case.
  viewerEmail: string | null
  viewerName: string | null
  className?: string
  // Lets a caller render a different look (e.g. CTA strip vs. inline).
  variant?: 'primary' | 'outline-on-dark'
  label?: string
}

export default function BookCallButton({
  viewerEmail,
  viewerName,
  className,
  variant = 'primary',
  label = 'Book a 1:1 with us',
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const onClick = () => {
    if (!viewerEmail) {
      router.push('/login?next=/work-with-us')
      return
    }
    setOpen(true)
  }

  const baseClass =
    variant === 'outline-on-dark'
      ? 'inline-flex items-center gap-1.5 bg-white text-brand-700 hover:bg-gray-100 font-bold text-sm px-5 py-2.5 rounded-md'
      : 'btn-primary'

  return (
    <>
      <button type="button" onClick={onClick} className={`${baseClass} ${className ?? ''}`}>
        {label} <ArrowRight className="w-4 h-4" />
      </button>
      <CallRequestModal
        open={open}
        onClose={() => setOpen(false)}
        defaultName={viewerName ?? ''}
        defaultEmail={viewerEmail ?? ''}
      />
    </>
  )
}
