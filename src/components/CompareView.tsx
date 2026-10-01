'use client'

import { useState } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'
import { formatDate, daysUntil, isFullDate } from '@/lib/utils'
import { getUniColor } from '@/lib/university'
import UniversityLogo from './UniversityLogo'
import { CriteriaBars, StatusPill } from './ProgramCard'

const MAX = 4

export default function CompareView({ programs }: { programs: any[] }) {
  const [selected, setSelected] = useState<string[]>(() => programs.filter(p => p.priority > 0).sort((a, b) => a.priority - b.priority).slice(0, 3).map(p => p.id))
  const [q, setQ] = useState('')

  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < MAX ? [...prev, id] : prev)
  const picked = selected.map(id => programs.find(p => p.id === id)).filter(Boolean) as any[]
  const candidates = programs
    .filter(p => !selected.includes(p.id))
    .filter(p => !q || `${p.university} ${p.faculty} ${p.major}`.toLowerCase().includes(q.toLowerCase()))

  const rows: { label: string; render: (p: any) => React.ReactNode }[] = [
    { label: 'สถานะ', render: p => <StatusPill status={p.status} /> },
    { label: 'รอบ', render: p => p.round || '—' },
    { label: 'หลักสูตร', render: p => p.curriculum || '—' },
    { label: 'เปิดรับสมัคร', render: p => formatDate(p.openDate) },
    { label: 'ปิดรับสมัคร', render: p => {
      const soon = isFullDate(p.closeDate) && daysUntil(p.closeDate) >= 0 && daysUntil(p.closeDate) <= 7
      return <span style={soon ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>{formatDate(p.closeDate)}</span>
    } },
    { label: 'สัมภาษณ์', render: p => formatDate(p.interviewDate) },
    { label: 'ประกาศผล', render: p => formatDate(p.resultDate) },
    { label: 'สัดส่วนคะแนน', render: p => <CriteriaBars criteria={p.criteria || ''} /> },
    { label: 'คุณสมบัติขั้นต่ำ', render: p => Array.isArray(p.requirements) && p.requirements.some((r: any) => r.label)
      ? <dl className="kv" style={{ fontSize: 13 }}>{p.requirements.filter((r: any) => r.label).map((r: any, i: number) => <div key={i} style={{ display: 'contents' }}><dt>{r.label}</dt><dd>{r.value || '—'}</dd></div>)}</dl>
      : '—' },
    { label: 'ช่องทางส่ง', render: p => p.tcasFolio ? 'TCASFolio' : p.submissionSystem || 'ส่ง Portfolio ปกติ' },
    { label: 'ค่าสมัคร', render: p => p.applicationFee != null
      ? <span>{p.applicationFee.toLocaleString('th-TH')} บาท <span style={{ color: p.feePaid ? 'var(--success)' : 'var(--text-faint)', fontSize: 12 }}>{p.feePaid ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'}</span></span> : '—' },
    { label: 'เอกสาร', render: p => p.documents?.length
      ? <div className="checklist">{p.documents.map((d: any) => <span key={d.id} style={{ fontSize: 13, display: 'flex', gap: 6, color: d.done ? 'var(--text-faint)' : undefined, textDecoration: d.done ? 'line-through' : undefined }}>{d.done ? <Check size={14} color="var(--success)" /> : <span style={{ width: 14 }}>•</span>}{d.text}</span>)}</div>
      : '—' },
    { label: 'บันทึก', render: p => p.note ? <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{p.note}</span> : '—' },
  ]

  return (
    <section aria-label="เปรียบเทียบ">
      <div className="cmp-picker">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>เลือกได้สูงสุด {MAX} รายการ</b>
          <span className="tag" data-tone={selected.length === MAX ? 'warn' : 'accent'}>{selected.length}/{MAX}</span>
        </div>
        {picked.length > 0 && (
          <div className="tags" style={{ marginTop: 0, marginBottom: 12 }}>
            {picked.map(p => (
              <button key={p.id} className="chip" aria-pressed="true" onClick={() => toggle(p.id)} aria-label={`เอา ${p.university} ออก`}>
                <span className="dot" style={{ background: getUniColor(p.university) }} />
                {p.university}{p.major ? ` / ${p.major}` : ''} <X size={13} />
              </button>
            ))}
          </div>
        )}
        {selected.length < MAX && (
          <>
            <label className="search">
              <Search size={16} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาเพื่อเพิ่มเข้าตาราง" />
            </label>
            <div className="cmp-results">
              {candidates.length === 0 ? <div style={{ padding: 14, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>ไม่พบรายการ</div>
                : candidates.map(p => (
                  <button key={p.id} className="cmp-result" onClick={() => { toggle(p.id); setQ('') }}>
                    <UniversityLogo university={p.university} logoUrl={p.logoUrl} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}><b>{p.university}</b><small>{[p.faculty, p.major].filter(Boolean).join(' / ')}</small></div>
                    <Plus size={16} color="var(--text-faint)" />
                  </button>
                ))}
            </div>
          </>
        )}
      </div>

      {picked.length === 0 ? (
        <div className="empty"><p style={{ margin: 0 }}>เลือกรายการด้านบนเพื่อดูข้อมูลเทียบกันแบบคอลัมน์ต่อคอลัมน์</p></div>
      ) : (
        <div className="cmp-table-wrap">
          <table className="cmp-table">
            <thead>
              <tr>
                <th />
                {picked.map(p => (
                  <th key={p.id} style={{ borderTop: `3px solid ${getUniColor(p.university)}` }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <UniversityLogo university={p.university} logoUrl={p.logoUrl} size={34} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.university}</div>
                        <div style={{ fontWeight: 400, fontSize: 12.5, color: 'var(--text-muted)' }}>{[p.faculty, p.major].filter(Boolean).join(' / ')}</div>
                      </div>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => toggle(p.id)} aria-label="เอาออก"><X size={14} /></button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  {picked.map(p => <td key={p.id}>{r.render(p)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
