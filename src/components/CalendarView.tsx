'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Edit2, Eye } from 'lucide-react'
import { isFullDate, formatDate, todayISO } from '@/lib/utils'
import { EVENT_KINDS, EVENT_BY_KIND, EventKind } from '@/lib/insights'
import { getUniColor, getUniAbbr } from '@/lib/university'

const THAI_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const DOW = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']
const MAX_PER_CELL = 3

type Ev = { id: string; kind: EventKind | 'period'; date?: string; start?: string; end?: string; p: any }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function CalendarView({ programs, onOpen, onEdit }: { programs: any[]; onOpen: (id: string) => void; onEdit?: (p: any) => void }) {
  const today = todayISO()
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selected, setSelected] = useState<string>(today)
  const [showPeriods, setShowPeriods] = useState(false)

  const year = cursor.getFullYear(), month = cursor.getMonth()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // จันทร์ = 0
  const cells = useMemo(() => {
    const start = new Date(year, month, 1 - firstDow)
    const weeks = Math.ceil((firstDow + new Date(year, month + 1, 0).getDate()) / 7)
    return Array.from({ length: weeks * 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  }, [year, month, firstDow])

  const events = useMemo(() => {
    const out: Ev[] = []
    for (const p of programs) {
      for (const e of EVENT_KINDS) {
        const raw = p[e.field]
        if (!isFullDate(raw)) continue
        if (showPeriods && (e.kind === 'open' || e.kind === 'close') && isFullDate(p.openDate) && isFullDate(p.closeDate)) continue
        out.push({ id: `${p.id}-${e.kind}`, kind: e.kind, date: raw, p })
      }
      if (showPeriods && isFullDate(p.openDate) && isFullDate(p.closeDate)) {
        out.push({ id: `${p.id}-period`, kind: 'period', start: p.openDate, end: p.closeDate, p })
      }
    }
    return out
  }, [programs, showPeriods])

  const eventsOn = (day: string) => events.filter(e => e.kind === 'period' ? e.start! <= day && e.end! >= day : e.date === day)
  const selectedEvents = eventsOn(selected)

  const go = (delta: number) => setCursor(new Date(year, month + delta, 1))
  const goToday = () => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); setSelected(today) }
  const label = (e: Ev) => e.kind === 'period' ? 'ช่วงรับสมัคร' : EVENT_BY_KIND[e.kind].label
  const color = (e: Ev) => e.kind === 'period' ? getUniColor(e.p.university) : EVENT_BY_KIND[e.kind].color

  return (
    <section className="cal" aria-label="ปฏิทินกำหนดการ">
      <div className="cal-head">
        <div className="cal-title">{THAI_MONTHS_FULL[month]} {year + 543}</div>
        <button className="btn btn-sm btn-icon" onClick={() => go(-1)} aria-label="เดือนก่อนหน้า"><ChevronLeft size={16} /></button>
        <button className="btn btn-sm btn-icon" onClick={() => go(1)} aria-label="เดือนถัดไป"><ChevronRight size={16} /></button>
        <button className="btn btn-sm" onClick={goToday}>วันนี้</button>
        <div style={{ flex: 1 }} />
        <label className="toggle" style={{ fontSize: 13 }}>
          <input type="checkbox" checked={showPeriods} onChange={e => setShowPeriods(e.target.checked)} />
          แสดงเป็นช่วงรับสมัคร
        </label>
      </div>
      <div className="cal-legend">
        {EVENT_KINDS.map(e => <span key={e.kind}><i style={{ background: e.color }} />{e.label}</span>)}
      </div>
      <div className="cal-dow">{DOW.map(d => <div key={d}>{d}</div>)}</div>
      <div className="cal-grid">
        {cells.map(d => {
          const key = iso(d)
          const evs = eventsOn(key)
          const out = d.getMonth() !== month
          return (
            <div key={key} className="cal-cell" data-out={out} data-today={key === today} data-selected={key === selected}
              onClick={() => setSelected(key)} role="button" tabIndex={0} aria-label={`${formatDate(key)} มี ${evs.length} กำหนดการ`}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(key) } }}>
              <span className="cal-day">{d.getDate()}</span>
              {evs.slice(0, MAX_PER_CELL).map(e => e.kind === 'period' ? (
                <button key={e.id} className="cal-band" onClick={ev => { ev.stopPropagation(); setSelected(key) }}
                  style={{ background: `color-mix(in srgb, ${color(e)} 16%, transparent)`, borderLeft: e.start === key || d.getDay() === 1 ? `3px solid ${color(e)}` : undefined }}>
                  {e.start === key || d.getDay() === 1 ? e.p.university : ' '}
                </button>
              ) : (
                <button key={e.id} className="cal-ev" title={`${label(e)}: ${e.p.university}`}
                  onClick={ev => { ev.stopPropagation(); setSelected(key) }}>
                  <i style={{ background: color(e) }} /><span>{EVENT_BY_KIND[e.kind as EventKind].short} {getUniAbbr(e.p.university)}{e.p.major ? ` ${e.p.major}` : ''}</span>
                </button>
              ))}
              {evs.length > MAX_PER_CELL && <span className="cal-more">อีก {evs.length - MAX_PER_CELL}</span>}
              {evs.length > 0 && <span className="cal-dots">{evs.slice(0, 4).map(e => <i key={e.id} style={{ background: color(e) }} />)}</span>}
            </div>
          )
        })}
      </div>

      <div className="cal-agenda" aria-live="polite">
        <h3>{selected === today ? 'วันนี้, ' : ''}{formatDate(selected)}</h3>
        {selectedEvents.length === 0 ? (
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>ไม่มีกำหนดการในวันนี้</div>
        ) : selectedEvents.map(e => (
          <div key={e.id} className="cal-agenda-item" style={{ borderLeftColor: color(e) }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <small style={{ color: color(e), fontWeight: 600 }}>{label(e)}{e.kind === 'period' ? ` ${formatDate(e.start)} ถึง ${formatDate(e.end)}` : ''}</small>
              <b>{e.p.university}</b>
              <small>{[e.p.faculty, e.p.major].filter(Boolean).join(' / ')}</small>
            </div>
            <button className="btn btn-sm" onClick={() => onOpen(e.p.id)}><Eye size={14} /> ดู</button>
            {onEdit && <button className="btn btn-sm btn-icon btn-ghost" onClick={() => onEdit(e.p)} aria-label="แก้ไข"><Edit2 size={14} /></button>}
          </div>
        ))}
      </div>
    </section>
  )
}
