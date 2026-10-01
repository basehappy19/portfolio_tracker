import { STATUS_META, NEXT_STATUS, THAI_MONTHS } from './constants'
import { computeUrgency, daysUntil, formatDate, isFullDate, isMonthYear, todayISO, checkStatusDisabled } from './utils'

export const TERMINAL_STATUSES = ['ยืนยันสิทธิ์แล้ว', 'ไม่ผ่านการคัดเลือก', 'สละสิทธิ์']
export const APPLIED_STATUSES = ['ยื่นสมัครแล้ว', 'ติดสัมภาษณ์', 'รอประกาศผล', 'ยืนยันสิทธิ์แล้ว', 'ไม่ผ่านการคัดเลือก', 'สละสิทธิ์']
export const INTERVIEWED_STATUSES = ['ติดสัมภาษณ์', 'รอประกาศผล', 'ยืนยันสิทธิ์แล้ว', 'ไม่ผ่านการคัดเลือก', 'สละสิทธิ์']
const NOT_APPLIED = ['รอประกาศเกณฑ์', 'ยังไม่เปิดรับสมัคร', 'รอยื่นสมัคร']

export const STATUS_DOT: Record<string, string> = {
  neutral: 'var(--neutral)', warn: 'var(--warn)', accent: 'var(--accent)', success: 'var(--success)', danger: 'var(--danger)',
}

/* ---------------- event kinds (ใช้ร่วมกันทุกมุมมอง) ---------------- */
export type EventKind = 'open' | 'close' | 'eligible' | 'interview' | 'result' | 'confirm'
export const EVENT_KINDS: { kind: EventKind; field: string; label: string; short: string; color: string }[] = [
  { kind: 'open',      field: 'openDate',              label: 'เปิดรับสมัคร',            short: 'เปิดรับ',     color: 'var(--ev-open)' },
  { kind: 'close',     field: 'closeDate',             label: 'ปิดรับสมัคร',             short: 'ปิดรับ',      color: 'var(--ev-close)' },
  { kind: 'eligible',  field: 'interviewEligibleDate', label: 'ประกาศมีสิทธิ์สัมภาษณ์',  short: 'มีสิทธิ์สัมภาษณ์', color: 'var(--ev-eligible)' },
  { kind: 'interview', field: 'interviewDate',         label: 'สัมภาษณ์',                short: 'สัมภาษณ์',    color: 'var(--ev-interview)' },
  { kind: 'result',    field: 'resultDate',            label: 'ประกาศผล',               short: 'ประกาศผล',   color: 'var(--ev-result)' },
  { kind: 'confirm',   field: 'confirmationDate',      label: 'หมดเขตยืนยันสิทธิ์',      short: 'ยืนยันสิทธิ์', color: 'var(--ev-confirm)' },
]
export const EVENT_BY_KIND = Object.fromEntries(EVENT_KINDS.map(e => [e.kind, e])) as Record<EventKind, typeof EVENT_KINDS[number]>

/* ---------------- stub (ต้นขั้วตั๋ว) ---------------- */
const MODE_WHAT: Record<string, string> = {
  urgent: 'ก่อนปิดรับสมัคร', soon: 'ก่อนปิดรับสมัคร', plenty: 'ก่อนปิดรับสมัคร',
  interviewEligible: 'ถึงประกาศสิทธิ์สัมภาษณ์', interview: 'ถึงวันสัมภาษณ์',
  result: 'ถึงวันประกาศผล', confirmation: 'ก่อนหมดเขตยืนยัน',
}

export type Stub = { tone: string; hot?: boolean; num?: number; unit?: string; what?: string; text?: string }

export function getStub(p: any): Stub {
  const u: any = computeUrgency(p)
  if (u.mode === 'terminal') {
    return { tone: p.status === 'ยืนยันสิทธิ์แล้ว' ? 'success' : p.status === 'ไม่ผ่านการคัดเลือก' ? 'danger' : 'neutral', text: p.status }
  }
  if (u.mode === 'notOpen' && isFullDate(p.openDate)) {
    return { tone: 'neutral', num: daysUntil(p.openDate), unit: 'วัน', what: 'ก่อนเปิดรับสมัคร' }
  }
  if (u.sortKey != null && u.diffDays > 0) {
    return { tone: u.tone, hot: u.diffDays <= 3, num: u.diffDays, unit: 'วัน', what: MODE_WHAT[u.mode] || u.dateLabel }
  }
  if (u.diffDays === 0) return { tone: 'danger', hot: true, text: u.label }
  return { tone: u.tone === 'warn' ? 'warn' : 'neutral', text: u.label }
}

/* ---------------- milestones ---------------- */
export type Milestone = { kind: EventKind; name: string; date: string | null; display: string; state: 'past' | 'next' | 'upcoming' | 'unknown' }

function dateKey(raw: string | null | undefined): string | null {
  if (isFullDate(raw)) return raw as string
  if (isMonthYear(raw)) return (raw as string) + '-28' // เดือนเท่านั้น: นับว่าผ่านเมื่อปลายเดือน
  return null
}

export function getMilestones(p: any): Milestone[] {
  const today = todayISO()
  const always: EventKind[] = ['open', 'close', 'result']
  const list = EVENT_KINDS
    .filter(e => always.includes(e.kind) || p[e.field])
    .map(e => {
      const raw = p[e.field]
      const key = dateKey(raw)
      return {
        kind: e.kind,
        name: e.short,
        date: key,
        display: raw ? shortDate(raw) : 'ยังไม่ประกาศ',
        state: (key ? (key < today ? 'past' : 'upcoming') : 'unknown') as Milestone['state'],
      }
    })
  const next = list.find(m => m.state === 'upcoming')
  if (next) next.state = 'next'
  return list
}

export function shortDate(raw: string): string {
  if (isFullDate(raw)) {
    const [y, m, d] = raw.split('-').map(Number)
    const thisYear = new Date().getFullYear()
    return y === thisYear ? `${d} ${THAI_MONTHS[m - 1]}` : `${d} ${THAI_MONTHS[m - 1]} ${String(y + 543).slice(2)}`
  }
  return formatDate(raw)
}

/* ---------------- next-step quick action ---------------- */
export function getNextStatus(p: any): string | null {
  // เสนอเฉพาะขั้นถัดไปเชิงบวก — ผลลบ (ไม่ผ่าน/สละสิทธิ์) ให้เลือกจากเมนูสถานะเอง
  const options = (NEXT_STATUS[p.status] || []).filter(s => s !== 'ไม่ผ่านการคัดเลือก' && s !== 'สละสิทธิ์')
  return options.find(s => !checkStatusDisabled(s, p.status, p)) || null
}

/* ---------------- agenda (สิ่งที่ต้องทำเร็ว ๆ นี้) ---------------- */
export type AgendaItem = { id: string; programId: string; days: number | null; what: string; who: string; tone: 'danger' | 'warn' | 'neutral'; tag?: string; tagTone?: string }

export function buildAgenda(programs: any[], windowDays = 21): AgendaItem[] {
  const items: AgendaItem[] = []
  const who = (p: any) => [p.university, p.major || p.faculty].filter(Boolean).join(' / ')
  const toneFor = (d: number) => (d <= 3 ? 'danger' : d <= 7 ? 'warn' : 'neutral') as AgendaItem['tone']

  for (const p of programs) {
    if (p.status === 'ไม่ผ่านการคัดเลือก' || p.status === 'สละสิทธิ์') continue
    const push = (field: string, what: string, extra: Partial<AgendaItem> = {}) => {
      const raw = p[field]
      if (!isFullDate(raw)) return
      const d = daysUntil(raw)
      if (d < 0 || d > windowDays) return
      items.push({ id: `${p.id}-${field}`, programId: p.id, days: d, what, who: who(p), tone: toneFor(d), ...extra })
    }
    const docsLeft = (p.documents || []).filter((x: any) => !x.done).length
    const feeDue = p.applicationFee > 0 && !p.feePaid

    if (NOT_APPLIED.includes(p.status)) {
      const notes = [docsLeft ? `เอกสารเหลือ ${docsLeft}` : null, feeDue ? `ค่าสมัคร ${p.applicationFee.toLocaleString('th-TH')} ฿` : null].filter(Boolean).join(' · ')
      push('closeDate', 'ปิดรับสมัคร ยื่นให้ทัน', notes ? { tag: notes, tagTone: 'warn' } : {})
      if (p.status !== 'รอยื่นสมัคร') push('openDate', 'เปิดรับสมัคร', {})
    }
    if (p.status !== 'ยืนยันสิทธิ์แล้ว') {
      if (!['ติดสัมภาษณ์', 'รอประกาศผล'].includes(p.status)) push('interviewEligibleDate', 'ประกาศรายชื่อมีสิทธิ์สัมภาษณ์')
      if (p.status !== 'รอประกาศผล') {
        const fmt = p.interviewFormat === 'online' ? 'Online' : p.interviewFormat === 'onsite' ? 'Onsite' : undefined
        push('interviewDate', 'สัมภาษณ์', fmt ? { tag: fmt, tagTone: 'accent' } : {})
      }
      push('resultDate', 'ประกาศผล')
    }
    push('confirmationDate', 'หมดเขตยืนยันสิทธิ์', { tag: 'อย่าลืมยืนยัน', tagTone: 'danger' })

    if (feeDue && p.status === 'ยื่นสมัครแล้ว') {
      items.push({ id: `${p.id}-fee`, programId: p.id, days: null, what: `จ่ายค่าสมัคร ${p.applicationFee.toLocaleString('th-TH')} บาท`, who: who(p), tone: 'warn', tag: 'ค้างจ่าย', tagTone: 'danger' })
    }
  }
  return items.sort((a, b) => (a.days ?? 999) - (b.days ?? 999))
}

/* ---------------- interview conflicts ---------------- */
export function buildInterviewAlerts(programs: any[]) {
  const alerts = new Map<string, { type: 'conflict' | 'close'; msg: string }>()
  const list = programs.filter(p => isFullDate(p.interviewDate) && daysUntil(p.interviewDate) >= 0)
  const setAlert = (id: string, type: 'conflict' | 'close', other: any) => {
    const cur = alerts.get(id)
    const part = `${other.university} (${formatDate(other.interviewDate)})`
    if (!cur || (cur.type === 'close' && type === 'conflict')) alerts.set(id, { type, msg: part })
    else if (cur.type === type && !cur.msg.includes(other.university)) alerts.set(id, { type, msg: cur.msg + ', ' + part })
  }
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]
    const diff = Math.abs((new Date(a.interviewDate + 'T00:00:00').getTime() - new Date(b.interviewDate + 'T00:00:00').getTime()) / 86400000)
    if (diff === 0) { setAlert(a.id, 'conflict', b); setAlert(b.id, 'conflict', a) }
    else if (diff <= 2) { setAlert(a.id, 'close', b); setAlert(b.id, 'close', a) }
  }
  return alerts
}

/* ---------------- criteria parsing ---------------- */
export function parseCriteria(text: string): { label: string; pct: number }[] {
  if (!text) return []
  const re = /([^,;%]+?)\s*(\d{1,3}(?:\.\d+)?)\s*%/g
  const out: { label: string; pct: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const label = m[1].replace(/^[,;\s]+|[,;\s]+$/g, '').trim()
    if (label) out.push({ label, pct: parseFloat(m[2]) })
  }
  return out.sort((a, b) => b.pct - a.pct)
}

/* ---------------- exports ---------------- */
function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportCSV(programs: any[]) {
  const headers = ['มหาวิทยาลัย', 'คณะ', 'สาขา', 'หลักสูตร', 'รอบ', 'สถานะ', 'เปิดรับสมัคร', 'ปิดรับสมัคร', 'ประกาศมีสิทธิ์สัมภาษณ์', 'วันสัมภาษณ์', 'ประกาศผล', 'หมดเขตยืนยันสิทธิ์', 'เกณฑ์การคัดเลือก', 'ลิงก์ประกาศ', 'ค่าสมัคร', 'จ่ายแล้ว', 'อันดับที่ชอบ']
  const rows = programs.map(p => [
    p.university, p.faculty, p.major, p.curriculum, p.round, p.status,
    p.openDate ? formatDate(p.openDate) : '', p.closeDate ? formatDate(p.closeDate) : '',
    p.interviewEligibleDate ? formatDate(p.interviewEligibleDate) : '', p.interviewDate ? formatDate(p.interviewDate) : '',
    p.resultDate ? formatDate(p.resultDate) : '', p.confirmationDate ? formatDate(p.confirmationDate) : '',
    p.criteria, p.link, p.applicationFee?.toString(), p.applicationFee ? (p.feePaid ? 'ใช่' : 'ยัง') : '', p.priority > 0 ? String(p.priority) : '',
  ])
  const csv = [headers, ...rows].map(r => r.map((c: any) => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
  download(`TCAS_Tracker_${todayISO()}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8;')
}

// ไฟล์ .ics นำเข้า Google Calendar / Apple Calendar / Outlook ได้ทันที
export function exportICS(programs: any[]) {
  const esc = (s: string) => (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
  const ymd = (iso: string) => iso.replace(/-/g, '')
  const nextDay = (iso: string) => {
    const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + 1)
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TCAS Tracker//TH', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:TCAS Tracker']
  let count = 0
  for (const p of programs) {
    if (p.status === 'ไม่ผ่านการคัดเลือก' || p.status === 'สละสิทธิ์') continue
    for (const e of EVENT_KINDS) {
      const raw = p[e.field]
      if (!isFullDate(raw)) continue
      count++
      const desc = [p.faculty, p.major, p.round, p.link].filter(Boolean).join('\n')
      lines.push(
        'BEGIN:VEVENT',
        `UID:${p.id}-${e.kind}@tcas-tracker`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ymd(raw)}`,
        `DTEND;VALUE=DATE:${nextDay(raw)}`,
        `SUMMARY:${esc(`${e.label}: ${p.university}${p.major ? ' – ' + p.major : ''}`)}`,
        `DESCRIPTION:${esc(desc)}`,
        ...(e.kind === 'close' || e.kind === 'confirm' || e.kind === 'interview'
          ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.label)}`, 'TRIGGER:-P1D', 'END:VALARM']
          : []),
        'END:VEVENT',
      )
    }
  }
  lines.push('END:VCALENDAR')
  download(`TCAS_Tracker_${todayISO()}.ics`, lines.join('\r\n'), 'text/calendar;charset=utf-8')
  return count
}

export { STATUS_META }
