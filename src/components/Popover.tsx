'use client'

import { useEffect, useRef, useState } from 'react'

/** ปุ่ม + เมนูลอยแบบเบา ๆ ปิดได้ด้วยการคลิกข้างนอกหรือกด Esc */
export default function Popover({
  trigger, children, align = 'left', width, onOpenChange,
}: {
  trigger: (props: { open: boolean; toggle: () => void; ref: React.RefObject<HTMLButtonElement | null> }) => React.ReactNode
  children: (close: () => void) => React.ReactNode
  align?: 'left' | 'right'
  width?: number
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [dropUp, setDropUp] = useState(false)

  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    const r = btnRef.current?.getBoundingClientRect()
    const spaceBelow = r ? window.innerHeight - r.bottom : 0
    const spaceAbove = r ? r.top : 0
    setDropUp(spaceBelow < 380 && spaceAbove > spaceBelow)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const close = () => setOpen(false)
  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {trigger({ open, toggle: () => setOpen(o => !o), ref: btnRef })}
      {open && (
        <div
          className="menu"
          role="menu"
          style={{
            [align]: 0,
            ...(dropUp ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
            ...(width ? { width } : {}),
          } as React.CSSProperties}
        >
          {children(close)}
        </div>
      )}
    </div>
  )
}
