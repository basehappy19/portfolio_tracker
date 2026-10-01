'use client'

import { memo } from 'react'
import { AlertTriangle, Check, ChevronDown, Edit2, ExternalLink, Building2, MoreHorizontal, Star, Trash2, Wallet, Globe, MapPin } from 'lucide-react'
import { STATUS_META, STATUS_ORDER, INTERVIEW_FORMAT_LABEL } from '@/lib/constants'
import { checkStatusDisabled, formatDate, isFullDate } from '@/lib/utils'
import { getAdmissionUrl, getUniColor } from '@/lib/university'
import { getStub, getMilestones, getNextStatus, parseCriteria, STATUS_DOT } from '@/lib/insights'
import UniversityLogo from './UniversityLogo'
import Popover from './Popover'

const CRIT_COLORS = ['var(--accent)', 'var(--ev-interview)', 'var(--ev-open)', 'var(--ev-result)', 'var(--ev-close)', 'var(--ev-confirm)', 'var(--text-muted)', 'var(--warn)']

export function CriteriaBars({ criteria }: { criteria: string }) {
  const items = parseCriteria(criteria)
  if (!items.length) return <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{criteria || 'ยังไม่ได้กรอก'}</div>
  return (
    <div className="crit">
      <div className="crit-stack" role="img" aria-label={items.map(i => `${i.label} ${i.pct}%`).join(', ')}>
        {items.map((it, i) => <div key={i} style={{ width: `${it.pct}%`, background: CRIT_COLORS[i % CRIT_COLORS.length] }} />)}
      </div>
      <div className="crit-legend">
        {items.map((it, i) => (
          <span key={i}><i style={{ background: CRIT_COLORS[i % CRIT_COLORS.length] }} />{it.label} <b>{it.pct}%</b></span>
        ))}
      </div>
    </div>
  )
}

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_META[status]?.color || 'neutral'
  return <span className="status-pill" data-tone={tone}><span className="dot" />{status}</span>
}

function StatusMenu({ p, onChange }: { p: any; onChange: (s: string) => void }) {
  const tone = STATUS_META[p.status]?.color || 'neutral'
  return (
    <Popover
      width={250}
      trigger={({ toggle, ref, open }) => (
        <button ref={ref} type="button" className="status-pill" data-tone={tone} onClick={toggle} aria-haspopup="menu" aria-expanded={open} title="เปลี่ยนสถานะ">
          <span className="dot" />{p.status}<ChevronDown size={13} strokeWidth={2.5} />
        </button>
      )}
    >
      {close => (
        <>
          <div className="menu-title">เปลี่ยนสถานะเป็น</div>
          {STATUS_ORDER.map(s => {
            const disabled = s !== p.status && checkStatusDisabled(s, p.status, p)
            const color = STATUS_DOT[STATUS_META[s]?.color || 'neutral']
            return (
              <button key={s} className="menu-item" role="menuitemradio" aria-checked={s === p.status} disabled={disabled}
                onClick={() => { close(); if (s !== p.status) onChange(s) }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: disabled ? 'var(--border-strong)' : color, flexShrink: 0 }} />
                {s}
                {s === p.status ? <small><Check size={14} /></small> : disabled ? <small>ยังไม่ถึงกำหนด</small> : null}
              </button>
            )
          })}
        </>
      )}
    </Popover>
  )
}

function Milestones({ p }: { p: any }) {
  const ms = getMilestones(p)
  const n = ms.length
  const lastPast = ms.map(m => m.state).lastIndexOf('past')
  const hasNext = ms.some(m => m.state === 'next')
  // จุดอยู่ชิดซ้ายของแต่ละคอลัมน์ → ระยะระหว่างจุด = 100%/n
  const lineW = ((n - 1) / n) * 100
  const doneW = lastPast >= 0 ? Math.min(lineW, ((lastPast + (hasNext ? 0.5 : 0)) / n) * 100) : 0
  return (
    <div className="track" aria-label="กำหนดการ">
      <div className="track-line" style={{ right: 'auto', width: `${lineW}%` }} />
      {doneW > 0 && <div className="track-done" style={{ width: `${doneW}%` }} />}
      <div className="track-steps" style={{ gridTemplateColumns: `repeat(${ms.length}, minmax(0, 1fr))` }}>
        {ms.map(m => (
          <div key={m.kind} className="step" data-state={m.state}>
            <div className="step-dot" />
            <div className="step-name">{m.name}</div>
            <div className="step-date">{m.display}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

type Props = {
  p: any
  readOnly?: boolean
  alert?: { type: 'conflict' | 'close'; msg: string }
  expanded: boolean
  flash?: boolean
  onToggleExpand: (id: string) => void
  onStar: (id: string) => void
  onEdit: (p: any) => void
  onDelete: (p: any) => void
  onStatus: (id: string, s: string) => void
  onFeePaid: (id: string, paid: boolean) => void
  onToggleDoc: (programId: string, docId: string, done: boolean) => void
}

function ProgramCard({ p, readOnly, alert, expanded, flash, onToggleExpand, onStar, onEdit, onDelete, onStatus, onFeePaid, onToggleDoc }: Props) {
  const stub = getStub(p)
  const docsTotal = p.documents?.length || 0
  const docsDone = p.documents?.filter((d: any) => d.done).length || 0
  const nextStatus = readOnly ? null : getNextStatus(p)
  const isDone = ['ยืนยันสิทธิ์แล้ว', 'ไม่ผ่านการคัดเลือก', 'สละสิทธิ์'].includes(p.status)
  const feeDue = p.applicationFee > 0 && !p.feePaid
  const requirements = Array.isArray(p.requirements) ? p.requirements.filter((r: any) => r?.label) : []
  const system = p.tcasFolio ? 'TCASFolio' : p.submissionSystem

  return (
    <article id={`program-${p.id}`} className="ticket" data-flash={flash ? 'true' : undefined} data-done={isDone ? 'true' : undefined}
      style={{ ['--uni' as any]: getUniColor(p.university) }}>
      <div className="stub" data-tone={stub.tone} data-hot={stub.hot ? 'true' : undefined}>
        {stub.num != null ? (
          <>
            <div className="stub-num">{stub.num}</div>
            <div>
              <div className="stub-unit">{stub.unit}</div>
              <div className="stub-what">{stub.what}</div>
            </div>
          </>
        ) : (
          <div className="stub-text">{stub.text}</div>
        )}
      </div>

      <div className="ticket-body">
        <div className="t-head">
          <UniversityLogo university={p.university} logoUrl={p.logoUrl} size={42} />
          <div className="t-titles">
            <div className="t-uni">{p.university}</div>
            <div className="t-prog">
              {[p.faculty && `คณะ${p.faculty.replace(/^คณะ/, '')}`, p.major].filter(Boolean).map((x, i) => (
                <span key={i}>{i > 0 && <span className="sep">/</span>}{x}</span>
              ))}
            </div>
          </div>
          {!readOnly && (
            <div className="t-actions">
              <button className="rank" data-active={p.priority > 0} onClick={() => onStar(p.id)}
                title={p.priority > 0 ? `อันดับที่ชอบ ${p.priority} (กดเพื่อยกเลิก)` : 'ปักเป็นอันดับที่ชอบ'}
                aria-label={p.priority > 0 ? `อันดับที่ชอบ ${p.priority}` : 'ปักเป็นอันดับที่ชอบ'}>
                <Star size={14} fill={p.priority > 0 ? 'currentColor' : 'none'} strokeWidth={2.2} />
                {p.priority > 0 && <span className="num">{p.priority}</span>}
              </button>
              <Popover align="right" width={210} trigger={({ toggle, ref, open }) => (
                <button ref={ref} className="btn btn-ghost btn-sm btn-icon" onClick={toggle} aria-label="ตัวเลือกเพิ่มเติม" aria-expanded={open}><MoreHorizontal size={18} /></button>
              )}>
                {close => (
                  <>
                    <button className="menu-item" onClick={() => { close(); onEdit(p) }}><Edit2 size={15} /> แก้ไขข้อมูล</button>
                    <a className="menu-item" href={p.admissionLink || getAdmissionUrl(p.university)} target="_blank" rel="noopener noreferrer" onClick={close} style={{ textDecoration: 'none' }}><Building2 size={15} /> เปิดระบบรับสมัคร</a>
                    {p.link && /^https?:/.test(p.link) && <a className="menu-item" href={p.link} target="_blank" rel="noopener noreferrer" onClick={close} style={{ textDecoration: 'none' }}><ExternalLink size={15} /> เปิดประกาศฉบับเต็ม</a>}
                    <div className="menu-sep" />
                    <button className="menu-item" style={{ color: 'var(--danger)' }} onClick={() => { close(); onDelete(p) }}><Trash2 size={15} /> ลบรายการ</button>
                  </>
                )}
              </Popover>
            </div>
          )}
        </div>

        <div className="tags">
          {readOnly ? <StatusPill status={p.status} /> : <StatusMenu p={p} onChange={s => onStatus(p.id, s)} />}
          {p.round && <span className="tag" title={p.round}>{p.round}</span>}
          {system && <span className="tag" data-tone="accent">ส่งผ่าน {system}</span>}
          {p.applicationFee > 0 && !readOnly && (feeDue ? (
            <button className="tag tag-btn" data-tone="danger" onClick={() => onFeePaid(p.id, true)} title="กดเมื่อจ่ายค่าสมัครแล้ว">
              <Wallet size={13} /> ค้างจ่าย {p.applicationFee.toLocaleString('th-TH')} ฿
            </button>
          ) : (
            <button className="tag tag-btn" data-tone="success" onClick={() => onFeePaid(p.id, false)} title="กดเพื่อยกเลิกสถานะจ่ายแล้ว">
              <Check size={13} /> จ่ายแล้ว {p.applicationFee.toLocaleString('th-TH')} ฿
            </button>
          ))}
        </div>

        {alert && (
          <div className="alert-line" data-tone={alert.type === 'conflict' ? 'danger' : 'warn'}>
            <AlertTriangle size={14} />
            <span>{alert.type === 'conflict' ? 'วันสัมภาษณ์ชนกับ ' : 'วันสัมภาษณ์ใกล้กับ '}{alert.msg}</span>
          </div>
        )}

        {!isDone && <Milestones p={p} />}

        <div className="t-foot">
          {docsTotal > 0 ? (
            <div className="docs-meter" data-complete={docsDone === docsTotal}>
              <div className="bar"><div style={{ width: `${(docsDone / docsTotal) * 100}%` }} /></div>
              <span>เอกสาร {docsDone}/{docsTotal}</span>
            </div>
          ) : <div style={{ flex: 1 }} />}
          {nextStatus && (
            <button className="btn btn-sm" onClick={() => onStatus(p.id, nextStatus)} title={`เปลี่ยนสถานะเป็น "${nextStatus}"`}>
              <Check size={14} /> {nextStatus}
            </button>
          )}
          <button className="expand-btn" aria-expanded={expanded} onClick={() => onToggleExpand(p.id)}>
            {expanded ? 'ซ่อนรายละเอียด' : 'รายละเอียด'} <ChevronDown size={15} />
          </button>
        </div>

        {expanded && (
          <div className="details">
            <div className="d-sec">
              <h4>สัดส่วนคะแนน</h4>
              <CriteriaBars criteria={p.criteria || ''} />
            </div>

            {requirements.length > 0 && (
              <div className="d-sec">
                <h4>คุณสมบัติขั้นต่ำ</h4>
                <dl className="kv">
                  {requirements.map((r: any, i: number) => <div key={i} style={{ display: 'contents' }}><dt>{r.label}</dt><dd>{r.value || '—'}</dd></div>)}
                </dl>
              </div>
            )}

            {docsTotal > 0 && (
              <div className="d-sec">
                <h4>เอกสารที่ต้องเตรียม</h4>
                <div className="checklist">
                  {p.documents.map((doc: any) => (
                    <label key={doc.id} className="check" style={readOnly ? { cursor: 'default' } : undefined}>
                      <input type="checkbox" checked={!!doc.done} disabled={readOnly} onChange={e => onToggleDoc(p.id, doc.id, e.target.checked)} />
                      <span>{doc.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(isFullDate(p.interviewDate) || p.interviewFormat || p.interviewPlace) && (
              <div className="d-sec">
                <h4>การสัมภาษณ์</h4>
                <dl className="kv">
                  <dt>วันที่</dt><dd>{formatDate(p.interviewDate)}</dd>
                  <dt>รูปแบบ</dt><dd>{INTERVIEW_FORMAT_LABEL[p.interviewFormat] || p.interviewFormat || '—'}</dd>
                  <dt>สถานที่</dt><dd>{p.interviewPlace || '—'}</dd>
                </dl>
              </div>
            )}

            {(p.curriculum || p.confirmationDate || p.interviewEligibleDate) && (
              <div className="d-sec">
                <h4>ข้อมูลหลักสูตร</h4>
                <dl className="kv">
                  {p.curriculum && <><dt>หลักสูตร</dt><dd>{p.curriculum}</dd></>}
                  {p.interviewEligibleDate && <><dt>มีสิทธิ์สัมภาษณ์</dt><dd>{formatDate(p.interviewEligibleDate)}</dd></>}
                  {p.confirmationDate && <><dt>ยืนยันสิทธิ์ภายใน</dt><dd>{formatDate(p.confirmationDate)}</dd></>}
                </dl>
              </div>
            )}

            {p.note && (
              <div className="d-sec d-full">
                <h4>บันทึก</h4>
                <div className="note-box">{p.note}</div>
              </div>
            )}

            <div className="d-sec d-full link-row">
              <a className="btn btn-sm" href={p.admissionLink || getAdmissionUrl(p.university)} target="_blank" rel="noopener noreferrer"><Globe size={14} /> ระบบรับสมัคร</a>
              {p.link && (/^https?:/.test(p.link)
                ? <a className="btn btn-sm" href={p.link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> ประกาศฉบับเต็ม</a>
                : <span className="tag" title="ชื่อไฟล์ประกาศ"><MapPin size={12} /> ไฟล์ประกาศ: {p.link}</span>)}
              {!readOnly && <button className="btn btn-sm btn-ghost" onClick={() => onEdit(p)}><Edit2 size={14} /> แก้ไข</button>}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

export default memo(ProgramCard)
