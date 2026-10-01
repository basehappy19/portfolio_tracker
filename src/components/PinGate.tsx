'use client'

import { useState, useEffect, useCallback } from 'react'
import { Delete } from 'lucide-react'
import { verifyPin } from '@/app/actions'

const STORAGE_KEY = 'tcas_auth'
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
const PIN_LEN = 4

function isAuthenticated(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const { expires } = JSON.parse(raw)
    return typeof expires === 'number' && Date.now() < expires
  } catch { return false }
}

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { setAuthed(isAuthenticated()) }, [])

  const submit = useCallback(async (value: string) => {
    setLoading(true)
    const ok = await verifyPin(value).catch(() => false)
    setLoading(false)
    if (ok) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ expires: Date.now() + ONE_YEAR_MS })) } catch {}
      setAuthed(true)
    } else {
      setError(true); setShake(true); setPin('')
      setTimeout(() => setShake(false), 450)
    }
  }, [])

  const press = useCallback((k: string) => {
    if (loading) return
    setError(false)
    if (k === 'del') { setPin(p => p.slice(0, -1)); return }
    setPin(p => {
      if (p.length >= PIN_LEN) return p
      const next = p + k
      if (next.length === PIN_LEN) setTimeout(() => submit(next), 120)
      return next
    })
  }, [loading, submit])

  // พิมพ์ PIN จากคีย์บอร์ดได้เลย
  useEffect(() => {
    if (authed !== false) return
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('del')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [authed, press])

  if (authed === null) return <div style={{ visibility: 'hidden' }}>{children}</div>
  if (authed) return <>{children}</>

  return (
    <div className="pin-screen">
      <div className={`pin-card ${shake ? 'shake' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-logo" src="/icon-70.png" alt="TCAS70" width={52} height={64} style={{ margin: '0 auto' }} />
        <h1>TCAS Tracker</h1>
        <p>ใส่รหัส PIN {PIN_LEN} หลักเพื่อเข้าใช้งาน</p>
        <div className="pin-dots" aria-label={`ใส่แล้ว ${pin.length} จาก ${PIN_LEN} หลัก`}>
          {Array.from({ length: PIN_LEN }, (_, i) => <i key={i} data-on={i < pin.length} />)}
        </div>
        <div className="pin-pad" style={{ opacity: loading ? 0.5 : 1 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) => k === '' ? <span key={i} /> : (
            <button key={i} type="button" className={k === 'del' ? 'ghost' : ''} onClick={() => press(k)} aria-label={k === 'del' ? 'ลบ' : k} disabled={loading}>
              {k === 'del' ? <Delete size={22} style={{ margin: '0 auto' }} /> : k}
            </button>
          ))}
        </div>
        <div className="pin-error" role="alert">{error ? 'PIN ไม่ถูกต้อง ลองอีกครั้ง' : ''}</div>
      </div>
    </div>
  )
}
