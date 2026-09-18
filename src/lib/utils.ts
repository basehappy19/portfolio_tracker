import { STATUS_META, THAI_MONTHS } from './constants'

export function todayISO() {
  const d = new Date()
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

export function isFullDate(s: string | null | undefined) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export function isMonthYear(s: string | null | undefined) {
  return typeof s === 'string' && /^\d{4}-\d{2}$/.test(s)
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  if (isFullDate(iso)) {
    const parts = iso.split('-')
    const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10)
    return `${d} ${THAI_MONTHS[m-1]} ${y+543}`
  }
  if (isMonthYear(iso)) {
    const parts = iso.split('-')
    return `${THAI_MONTHS[parseInt(parts[1], 10)-1]} ${parseInt(parts[0], 10)+543}`
  }
  return iso
}

export function daysUntil(iso: string) {
  const today = new Date(todayISO() + 'T00:00:00')
  const target = new Date(iso + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function countdownChip(diffDays: number, pastLabel: string, dueTodayLabel: string) {
  if (diffDays < 0) return { tone: 'neutral', label: pastLabel, sortRank: 3.5, diffDays }
  if (diffDays === 0) return { tone: 'danger', label: dueTodayLabel, sortRank: 0, sortKey: 0, diffDays }
  if (diffDays <= 7) return { tone: 'danger', label: `เหลือ ${diffDays} วัน`, sortRank: 0, sortKey: diffDays, diffDays }
  if (diffDays <= 21) return { tone: 'warn', label: `เหลือ ${diffDays} วัน`, sortRank: 1, sortKey: diffDays, diffDays }
  return { tone: 'accent', label: `เหลือ ${diffDays} วัน`, sortRank: 2, sortKey: diffDays, diffDays }
}

export function computeUrgency(p: any) {
  const meta = STATUS_META[p.status] || STATUS_META['รอประกาศเกณฑ์']

  if (p.status === 'รอประกาศผล') {
    if (isFullDate(p.resultDate)) {
      const diff = daysUntil(p.resultDate)
      if (diff >= 0) {
        const c = countdownChip(diff, '', 'ประกาศผลวันนี้') as any
        c.mode = 'result'
        c.dateLabel = 'รอประกาศผล'
        return c
      }
    }
    return { mode: 'actionNeeded', tone: 'warn', label: 'รอประกาศผล', sortRank: 0.7 }
  }

  if (meta.category === 'terminal') {
    return { mode: 'terminal', tone: meta.color, label: p.status, sortRank: 5 }
  }

  if (!isFullDate(p.closeDate)) {
    return { mode: 'unknown', tone: 'neutral', label: 'รอประกาศกำหนดการ', sortRank: 4 }
  }

  const diffDays = daysUntil(p.closeDate)
  let notYetOpen = false
  if (isFullDate(p.openDate)) {
    const open = new Date(p.openDate + 'T00:00:00')
    const today = new Date(todayISO() + 'T00:00:00')
    if (today < open) notYetOpen = true
  }

  if (diffDays < 0) {
    // If closed, cascade to the next upcoming event
    const events = [
      { date: p.interviewEligibleDate, name: 'ประกาศมีสิทธิ์สัมภาษณ์', type: 'interviewEligible', today: 'ประกาศมีสิทธิ์สัมภาษณ์วันนี้', skip: p.status === 'ติดสัมภาษณ์' || p.status === 'รอประกาศผล' || p.status === 'ยืนยันสิทธิ์แล้ว' },
      { date: p.interviewDate, name: 'วันสัมภาษณ์', type: 'interview', today: 'สัมภาษณ์วันนี้', skip: p.status === 'รอประกาศผล' || p.status === 'ยืนยันสิทธิ์แล้ว' },
      { date: p.resultDate, name: 'วันประกาศผล', type: 'result', today: 'ประกาศผลวันนี้', skip: p.status === 'ยืนยันสิทธิ์แล้ว' },
      { date: p.confirmationDate, name: 'หมดเขตยืนยันสิทธิ์', type: 'confirmation', today: 'หมดเขตยืนยันสิทธิ์วันนี้' }
    ]
    for (const evt of events) {
      if (evt.skip) continue
      if (isFullDate(evt.date)) {
        const diff = daysUntil(evt.date)
        if (diff >= 0) {
          const c = countdownChip(diff, '', evt.today) as any
          c.mode = evt.type
          c.dateLabel = `รอ${evt.name}`
          return c
        }
      }
    }
    return { mode: 'closed', tone: 'neutral', label: 'ปิดรับสมัครแล้ว', diffDays, sortRank: 3.5 }
  }
  
  if (notYetOpen) {
    return { mode: 'notOpen', tone: 'neutral', label: 'ยังไม่เปิดรับ', diffDays, sortRank: 3 }
  }

  const chip = countdownChip(diffDays, '', 'ปิดวันนี้') as any
  chip.mode = diffDays <= 7 ? 'urgent' : (diffDays <= 21 ? 'soon' : 'plenty')
  return chip
}


export function checkStatusDisabled(targetStatus: string, currentStatus: string, programDates: any): boolean {
  const today = new Date(todayISO() + 'T00:00:00');
  
  const parseD = (val: any) => {
    if (val instanceof Date) return val;
    if (isFullDate(val)) return new Date(val + 'T00:00:00');
    return null;
  };
  const openD = parseD(programDates?.openDate);
  const closeD = parseD(programDates?.closeDate);
  const intEligibleD = parseD(programDates?.interviewEligibleDate);
  const intD = parseD(programDates?.interviewDate);
  const resultD = parseD(programDates?.resultDate);

  const isBefore = (d: Date | null) => d && today < d;
  const isAfterOrOn = (d: Date | null) => d && today >= d;

  // Some explicit logic for each status
  if (targetStatus === 'รอประกาศเกณฑ์' || targetStatus === 'ยังไม่เปิดรับสมัคร') {
    if (isAfterOrOn(openD) || isAfterOrOn(closeD)) return true;
  }
  if (targetStatus === 'รอยื่นสมัคร') {
    if (isBefore(openD)) return true;
    if (isAfterOrOn(closeD)) return true;
  }
  if (targetStatus === 'ยื่นสมัครแล้ว') {
    if (isBefore(openD)) return true;
    // We allow setting to ยื่นสมัครแล้ว even after close date, in case user forgot
  }
  if (targetStatus === 'ติดสัมภาษณ์') {
    // Should wait until eligible date. If not set, wait until close date
    if (intEligibleD) {
      if (isBefore(intEligibleD)) return true;
    } else {
      if (isBefore(closeD)) return true;
    }
  }
  if (targetStatus === 'รอประกาศผล') {
    if (intD) {
      if (isBefore(intD)) return true;
    } else if (intEligibleD) {
      if (isBefore(intEligibleD)) return true;
    } else {
      if (isBefore(closeD)) return true;
    }
  }
  if (targetStatus === 'ยืนยันสิทธิ์แล้ว') {
    if (resultD) {
      if (isBefore(resultD)) return true;
    } else {
      if (isBefore(closeD)) return true;
    }
  }
  if (targetStatus === 'ไม่ผ่านการคัดเลือก') {
    if (isBefore(closeD)) return true;
  }

  // Prevent reverting logic from previous simple logic
  if (currentStatus === 'ยื่นสมัครแล้ว' && (targetStatus === 'ยังไม่เปิดรับสมัคร' || targetStatus === 'รอยื่นสมัคร')) return true;
  if (currentStatus === 'ติดสัมภาษณ์' && (targetStatus === 'ยังไม่เปิดรับสมัคร' || targetStatus === 'รอยื่นสมัคร' || targetStatus === 'ยื่นสมัครแล้ว')) return true;
  if (currentStatus === 'รอประกาศผล' && (targetStatus === 'ยังไม่เปิดรับสมัคร' || targetStatus === 'รอยื่นสมัคร' || targetStatus === 'ยื่นสมัครแล้ว' || targetStatus === 'ติดสัมภาษณ์')) return true;
  if (currentStatus === 'ยืนยันสิทธิ์แล้ว' && (targetStatus === 'ยังไม่เปิดรับสมัคร' || targetStatus === 'รอยื่นสมัคร' || targetStatus === 'ยื่นสมัครแล้ว' || targetStatus === 'ติดสัมภาษณ์' || targetStatus === 'รอประกาศผล')) return true;

  return false;
}

export function resolveAutoStatus(p: {
  status: string
  openDate?: string | null
  closeDate?: string | null
  interviewDate?: string | null
  resultDate?: string | null
}): string {
  const today = todayISO()
  const { status, openDate, closeDate, interviewDate, resultDate } = p

  // ถ้าเป็น "ยังไม่เปิดรับสมัคร" หรือ "รอประกาศเกณฑ์"
  if (status === 'ยังไม่เปิดรับสมัคร' || status === 'รอประกาศเกณฑ์') {
    if (isFullDate(openDate)) {
      if (today >= openDate!) {
        // หากยังไม่หมดเวลารับสมัคร หรือไม่ได้ระบุวันปิดรับ
        if (!isFullDate(closeDate) || today <= closeDate!) {
          return 'รอยื่นสมัคร'
        }
      } else {
        // ถ้าวันเปิดรับยังมาไม่ถึง แต่มีวันระบุแล้ว เปลี่ยนจากรอประกาศเกณฑ์เป็นยังไม่เปิดรับสมัคร
        if (status === 'รอประกาศเกณฑ์') {
          return 'ยังไม่เปิดรับสมัคร'
        }
      }
    }
  }

  // ถ้าเป็น "รอยื่นสมัคร" แต่วันเปิดรับในระบบอยู่หลังจากวันนี้ (เช่น เลื่อนวัน)
  if (status === 'รอยื่นสมัคร') {
    if (isFullDate(openDate) && today < openDate!) {
      return 'ยังไม่เปิดรับสมัคร'
    }
  }

  // ถ้าเป็น "ติดสัมภาษณ์" และพ้นวันสัมภาษณ์ไปแล้ว (today > interviewDate) และยังไม่ถึงวันประกาศผล (today < resultDate)
  if (status === 'ติดสัมภาษณ์') {
    if (isFullDate(interviewDate) && today > interviewDate!) {
      if (!isFullDate(resultDate) || today < resultDate!) {
        return 'รอประกาศผล'
      }
    }
  }

  return status
}
