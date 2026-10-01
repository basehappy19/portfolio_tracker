'use client'

import { useMemo, useState } from 'react'
import { buildAgenda, APPLIED_STATUSES, INTERVIEWED_STATUSES } from '@/lib/insights'
import { formatDate, todayISO } from '@/lib/utils'

const TAG_STYLE: Record<string, React.CSSProperties> = {
  danger: { background: 'var(--danger-soft)', color: 'var(--danger)' },
  warn: { background: 'var(--warn-soft)', color: 'var(--warn)' },
  accent: { background: 'var(--accent-soft)', color: 'var(--accent)' },
}

export default function Overview({ programs, onJump }: { programs: any[]; onJump: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false)
  const agenda = useMemo(() => buildAgenda(programs), [programs])
  const visible = showAll ? agenda : agenda.slice(0, 5)

  const total = programs.length
  const applied = programs.filter(p => APPLIED_STATUSES.includes(p.status)).length
  const interviewed = programs.filter(p => INTERVIEWED_STATUSES.includes(p.status)).length
  const selected = programs.filter(p => p.status === 'ยืนยันสิทธิ์แล้ว' || p.status === 'สละสิทธิ์').length
  const pipeline = [
    { k: 'all', label: 'ติดตามอยู่', n: total },
    { k: 'applied', label: 'ยื่นสมัครแล้ว', n: applied },
    { k: 'interview', label: 'ได้สัมภาษณ์', n: interviewed },
    { k: 'selected', label: 'ผ่านการคัดเลือก', n: selected },
  ]

  const withFee = programs.filter(p => p.applicationFee != null && p.applicationFee > 0)
  const totalFee = withFee.reduce((s, p) => s + p.applicationFee, 0)
  const paidFee = withFee.filter(p => p.feePaid).reduce((s, p) => s + p.applicationFee, 0)
  const unpaid = withFee.filter(p => !p.feePaid)

  return (
    <section className="overview" aria-label="ภาพรวม">
      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">ต้องทำใน 3 สัปดาห์นี้</h2>
          <span className="panel-meta">วันนี้ {formatDate(todayISO())}</span>
        </div>
        {agenda.length === 0 ? (
          <div className="agenda-empty">ไม่มีกำหนดการสำคัญใน 21 วันข้างหน้า ใช้เวลานี้เตรียม Portfolio ให้พร้อมได้เลย</div>
        ) : (
          <ul className="agenda">
            {visible.map(a => (
              <li key={a.id}>
                <button className="agenda-item" onClick={() => onJump(a.programId)}>
                  <div className="agenda-when" data-tone={a.tone}>
                    {a.days == null ? <div className="u">ด่วน</div>
                      : a.days === 0 ? <><div className="d"><span className="hl">วันนี้</span></div></>
                      : <><div className="d">{a.days}</div><div className="u">วัน</div></>}
                  </div>
                  <div className="agenda-main">
                    <div className="agenda-what">{a.days != null && a.days <= 3 ? <span className="hl">{a.what}</span> : a.what}</div>
                    <div className="agenda-who">{a.who}</div>
                  </div>
                  {a.tag && <span className="agenda-tag" style={TAG_STYLE[a.tagTone || 'warn']}>{a.tag}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {agenda.length > 5 && (
          <button className="linkish" style={{ marginTop: 8 }} onClick={() => setShowAll(v => !v)}>
            {showAll ? 'แสดงน้อยลง' : `ดูอีก ${agenda.length - 5} รายการ`}
          </button>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">ความคืบหน้า</h2>
        </div>
        <div className="pipeline">
          {pipeline.map(r => (
            <div key={r.k} className="pipe-row" data-k={r.k}>
              <span className="pipe-label">{r.label}</span>
              <div className="pipe-track"><div className="pipe-fill" style={{ width: total ? `${(r.n / total) * 100}%` : 0 }} /></div>
              <span className="pipe-num">{r.n}</span>
            </div>
          ))}
        </div>

        {withFee.length > 0 && (
          <div className="fee-box">
            <div className="fee-line">
              <span style={{ color: 'var(--text-muted)' }}>ค่าสมัคร จ่ายแล้ว</span>
              <span><span className="fee-big num">{paidFee.toLocaleString('th-TH')}</span> <span style={{ color: 'var(--text-muted)' }}>/ {totalFee.toLocaleString('th-TH')} บาท</span></span>
            </div>
            <div className="fee-bar"><div style={{ width: `${totalFee ? (paidFee / totalFee) * 100 : 0}%` }} /></div>
            {unpaid.length > 0 ? (
              <ul className="fee-unpaid">
                {unpaid.slice(0, 4).map(p => (
                  <li key={p.id}>
                    <span>{p.university}{p.major ? ` / ${p.major}` : ''}</span>
                    <b style={{ color: 'var(--danger)' }} className="num">{p.applicationFee.toLocaleString('th-TH')} ฿</b>
                  </li>
                ))}
                {unpaid.length > 4 && <li><span>และอีก {unpaid.length - 4} รายการ</span></li>}
              </ul>
            ) : <div style={{ fontSize: 12.5, color: 'var(--success)' }}>จ่ายครบทุกรายการแล้ว</div>}
          </div>
        )}
      </div>
    </section>
  )
}
