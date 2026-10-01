'use client'

import { useEffect, useRef } from 'react'

export default function ConfirmDialog({
  title, body, confirmLabel, onConfirm, onCancel, danger = true,
}: {
  title: string
  body?: React.ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="dialog dialog-sm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="dialog-head"><h2 id="confirm-title">{title}</h2></div>
        {body && <div className="dialog-body" style={{ color: 'var(--text-muted)', fontSize: 14 }}>{body}</div>}
        <div className="dialog-foot" style={{ justifyContent: 'flex-end', borderTop: body ? undefined : 0 }}>
          <button ref={cancelRef} className="btn" onClick={onCancel}>ยกเลิก</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
