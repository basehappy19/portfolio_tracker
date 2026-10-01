'use client'

import { useEffect, useState } from 'react'
import { MapPin, Paperclip, FileCheck2 } from 'lucide-react'
import { todayISO } from '@/lib/utils'
import { EVENT_KINDS } from '@/lib/insights'
import { StatusPill } from './ProgramCard'

const THAI_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const THAI_DOW = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

type TlEvent = { id: string; p: any; date: string; monthOnly: boolean; kind: typeof EVENT_KINDS[number] }

export default function TimelineView({ programs, onOpen }: { programs: any[]; onOpen: (id: string) => void }) {
  const today = todayISO()
  const [showPast, setShowPast] = useState(false)
  useEffect(() => { try { setShowPast(localStorage.getItem('tl_showPast') === '1') } catch {} }, [])
  const togglePast = (v: boolean) => { setShowPast(v); try { localStorage.setItem('tl_showPast', v ? '1' : '0') } catch {} }

  const events: TlEvent[] = []
  const undated: any[] = []
  for (const p of programs) {
    let any = false
    for (const k of EVENT_KINDS) {
      const raw = p[k.field]
      if (!raw) continue
      const full = /^\d{4}-\d{2}-\d{2}$/.test(raw), month = /^\d{4}-\d{2}$/.test(raw)
      if (!full && !month) continue
      any = true
      events.push({ id: `${p.id}-${k.kind}`, p, date: full ? raw : raw + '-01', monthOnly: month, kind: k })
    }
    if (!any) undated.push(p)
  }
  const visible = (showPast ? events : events.filter(e => e.monthOnly ? e.date.slice(0, 7) >= today.slice(0, 7) : e.date >= today))
    .sort((a, b) => a.date.localeCompare(b.date))
  const pastCount = events.length - events.filter(e => e.date >= today).length

  const grouped: Record<string, TlEvent[]> = {}
  for (const ev of visible) (grouped[ev.date.slice(0, 7)] ||= []).push(ev)

  return (
    <section aria-label="ไทม์ไลน์">
      <div className="tl-toolbar">
        <div className="cal-legend" style={{ border: 0, padding: 0 }}>
          {EVENT_KINDS.map(e => <span key={e.kind}><i style={{ background: e.color }} />{e.label}</span>)}
        </div>
        <label className="toggle" style={{ fontSize: 13 }}>
          <input type="checkbox" checked={showPast} onChange={e => togglePast(e.target.checked)} />
          แสดงที่ผ่านไปแล้ว{pastCount > 0 ? ` (${pastCount})` : ''}
        </label>
      </div>

      {visible.length === 0 && <div className="empty"><p style={{ margin: 0 }}>ยังไม่มีกำหนดการข้างหน้า</p></div>}

      {Object.entries(grouped).map(([key, evs]) => {
        const [y, m] = key.split('-').map(Number)
        const isNow = key === today.slice(0, 7)
        return (
          <div key={key} className="tl-month">
            <div className="tl-month-label" data-now={isNow}>
              {THAI_MONTHS_FULL[m - 1]}
              <small>{isNow ? 'เดือนนี้' : `พ.ศ. ${y + 543}`}</small>
            </div>
            <div className="tl-events">
              {evs.map(ev => {
                const p = ev.p
                const d = new Date(ev.date + 'T00:00:00')
                const docsTotal = p.documents?.length || 0
                const docsDone = p.documents?.filter((x: any) => x.done).length || 0
                return (
                  <button key={ev.id} className="tl-ev" data-past={!ev.monthOnly && ev.date < today} data-today={ev.date === today}
                    style={{ ['--c' as any]: ev.kind.color }} onClick={() => onOpen(p.id)}>
                    <div className="tl-date">
                      {ev.monthOnly ? <><b>–</b><small>ทั้งเดือน</small></> : <><b>{d.getDate()}</b><small>{ev.date === today ? 'วันนี้' : THAI_DOW[d.getDay()]}</small></>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <span className="tl-kind">{ev.kind.label}{ev.monthOnly ? ' (ประมาณการ)' : ''}</span>
                        <StatusPill status={p.status} />
                      </div>
                      <div className="tl-name">{p.university}</div>
                      <div className="tl-sub">{[p.faculty, p.major].filter(Boolean).join(' / ')}</div>
                      {(ev.kind.kind === 'close' && (docsTotal > 0 || p.tcasFolio || p.submissionSystem)) && (
                        <div className="tl-extra">
                          {docsTotal > 0 && <span><FileCheck2 size={13} /> เอกสาร {docsDone}/{docsTotal}</span>}
                          {(p.tcasFolio || p.submissionSystem) && <span><Paperclip size={13} /> ส่งผ่าน {p.submissionSystem || 'TCASFolio'}</span>}
                        </div>
                      )}
                      {ev.kind.kind === 'interview' && (p.interviewFormat || p.interviewPlace) && (
                        <div className="tl-extra">
                          <span><MapPin size={13} /> {[p.interviewFormat === 'online' ? 'Online' : p.interviewFormat === 'onsite' ? 'Onsite' : '', p.interviewPlace].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {undated.length > 0 && (
        <details style={{ marginTop: 18 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13.5, color: 'var(--text-muted)', fontWeight: 600 }}>ยังไม่ประกาศกำหนดการ {undated.length} รายการ</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {undated.map(p => (
              <button key={p.id} className="cmp-result" style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }} onClick={() => onOpen(p.id)}>
                <div style={{ flex: 1 }}><b>{p.university}</b><small>{[p.faculty, p.major].filter(Boolean).join(' / ')}</small></div>
                <StatusPill status={p.status} />
              </button>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
