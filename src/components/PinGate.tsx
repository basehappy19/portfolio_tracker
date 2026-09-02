'use client'

import { useState, useEffect, useRef } from 'react'
import { verifyPin } from '@/app/actions'

const STORAGE_KEY = 'tcas_auth'
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const { expires } = JSON.parse(raw)
    return typeof expires === 'number' && Date.now() < expires
  } catch {
    return false
  }
}

function saveAuth() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ expires: Date.now() + ONE_YEAR_MS }))
}

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAuthed(isAuthenticated())
  }, [])

  useEffect(() => {
    if (authed === false) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [authed])

  const submit = async (pinValue: string) => {
    setLoading(true)
    const valid = await verifyPin(pinValue)
    setLoading(false)
    if (valid) {
      saveAuth()
      setAuthed(true)
    } else {
      setError(true)
      setShake(true)
      setPin('')
      setTimeout(() => setShake(false), 500)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit(pin)
  }

  // Still checking
  if (authed === null) {
    return <div style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}>{children}</div>
  }

  // Authenticated
  if (authed) return <>{children}</>

  // Show PIN screen
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg, #f8fafc)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24, padding: 24,
      animation: 'fadeIn 0.3s ease both',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>TCAS Tracker</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted, #666)', marginTop: 6 }}>กรอก PIN เพื่อเข้าใช้งาน</p>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        padding: '32px 40px', borderRadius: 20,
        background: '#fff', border: '1px solid var(--border, #e5e7eb)',
        boxShadow: '0 8px 32px -8px rgba(0,0,0,0.12)',
        animation: shake ? 'shakePin 0.4s ease' : 'none',
        width: '100%', maxWidth: 300,
      }}>
        <style>{`
          @keyframes shakePin {
            0%,100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-6px); }
            80% { transform: translateX(6px); }
          }
        `}</style>

        {/* Dot indicators */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: i < pin.length ? '#1a2420' : 'var(--surface-3, #e5e7eb)',
              transition: 'background 0.15s ease',
              border: '1.5px solid var(--border, #e5e7eb)',
            }} />
          ))}
        </div>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          disabled={loading}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 4)
            setPin(v)
            setError(false)
            if (v.length === 4) {
              setTimeout(() => submit(v), 120)
            }
          }}
          onKeyDown={handleKey}
          style={{
            position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1,
          }}
        />

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((key, i) => (
            <button key={i}
              onClick={() => {
                if (key === '⌫') { setPin(p => p.slice(0, -1)); setError(false); return }
                if (key === '') return
                const next = (pin + key).slice(0, 4)
                setPin(next)
                setError(false)
                if (next.length === 4) {
                  setTimeout(() => submit(next), 120)
                }
              }}
              style={{
                height: 52, borderRadius: 12, border: 'none',
                background: key === '' ? 'transparent' : 'var(--surface-2, #f4f7f6)',
                fontSize: 18, fontWeight: 600, cursor: key === '' ? 'default' : 'pointer',
                transition: 'background 0.1s ease, transform 0.08s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseDown={e => { if (key !== '') (e.currentTarget.style.transform = 'scale(0.92)') }}
              onMouseUp={e => { (e.currentTarget.style.transform = 'scale(1)') }}
              onMouseLeave={e => { (e.currentTarget.style.transform = 'scale(1)') }}
            >
              {key}
            </button>
          ))}
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#ef4444', margin: 0, animation: 'fadeIn 0.2s ease' }}>
            PIN ไม่ถูกต้อง ลองใหม่อีกครั้ง
          </p>
        )}
      </div>
    </div>
  )
}
