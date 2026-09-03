'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { STATUS_META, STATUS_ORDER, INTERVIEW_FORMAT_LABEL } from '@/lib/constants'
import { computeUrgency, formatDate, isFullDate, todayISO } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Check, X, MapPin, Building, ExternalLink, Paperclip, AlertTriangle, Star, Trash2, Edit2, ChevronDown, ChevronRight, Calendar, Search } from 'lucide-react'
import { createProgram, updateProgram, deleteProgram, toggleDocument, setPriority, setPriorities, updateStatus, setFeePaid } from '@/app/actions'
import ProgramFormModal from './ProgramFormModal'

function parseCriteria(text: string): { label: string; pct: number }[] {
  if (!text) return []
  const re = /([^,;%]+?)\s*(\d{1,3}(?:\.\d+)?)\s*%/g
  const results: { label: string; pct: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const label = m[1].replace(/^[,;\s]+|[,;\s]+$/g, '').trim()
    if (label) results.push({ label, pct: parseFloat(m[2]) })
  }
  return results.sort((a, b) => b.pct - a.pct)
}

const BAR_COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#14b8a6','#f97316'
]

function CriteriaBars({ criteria }: { criteria: string }) {
  const items = parseCriteria(criteria)
  if (!items.length) return <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{criteria || '—'}</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>{item.label}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: BAR_COLORS[i % BAR_COLORS.length] }}>{item.pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
            <div
              className="criteria-bar-fill"
              style={{
                height: '100%',
                width: `${item.pct}%`,
                borderRadius: 99,
                background: BAR_COLORS[i % BAR_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const ADMISSION_URLS: Record<string, string> = {
  'จุฬาลงกรณ์': 'https://admission.chula.ac.th/',
  'ธรรมศาสตร์': 'https://www.tuadmissions.in.th/',
  'มหิดล': 'https://tcas.mahidol.ac.th/',
  'เชียงใหม่': 'https://www1.reg.cmu.ac.th/ugradapply/',
  'เกษตรศาสตร์': 'https://admission.ku.ac.th/',
  'ขอนแก่น': 'https://admissions.kku.ac.th/',
  'ลาดกระบัง': 'https://new.reg.kmitl.ac.th/admission/',
  'พระจอมเกล้าธนบุรี': 'https://admission.kmutt.ac.th/',
  'พระนครเหนือ': 'https://admission.kmutnb.ac.th/',
  'ศิลปากร': 'https://admission.su.ac.th/',
  'ศรีนครินทรวิโรฒ': 'https://admission.swu.ac.th/',
  'สงขลานครินทร์': 'https://entrance.psu.ac.th/',
  'บูรพา': 'https://reg.buu.ac.th/',
  'นเรศวร': 'https://admission.nu.ac.th/',
  'เทคโนโลยีสุรนารี': 'https://sutgateway.sut.ac.th/',
  'มหาสารคาม': 'https://admission.msu.ac.th/',
}

function getAdmissionUrl(university: string) {
  for (const [key, url] of Object.entries(ADMISSION_URLS)) {
    if (university.includes(key)) return url
  }
  return `https://www.google.com/search?q=${encodeURIComponent('ระบบรับสมัครนักศึกษา ' + university)}`
}

/* ============ University Domain (สำหรับดึง favicon จริง) ============ */
const UNI_DOMAIN: Record<string, string> = {
  'จุฬาลงกรณ์':         'chula.ac.th',
  'ธรรมศาสตร์':         'tu.ac.th',
  'มหิดล':             'mahidol.ac.th',
  'มหาสารคาม':          'msu.ac.th',
  'เทคโนโลยีสุรนารี':   'sut.ac.th',
  'เชียงใหม่':          'cmu.ac.th',
  'สงขลานครินทร์':      'psu.ac.th',
  'พระจอมเกล้าธนบุรี':  'kmutt.ac.th',
  'ลาดกระบัง':          'kmitl.ac.th',
  'ศรีนครินทรวิโรฒ':    'swu.ac.th',
  'พระนครเหนือ':        'kmutnb.ac.th',
  'บูรพา':             'buu.ac.th',
  'สวนสุนันทา':         'ssru.ac.th',
  'อุบลราชธานี':        'ubu.ac.th',
  'เกษตรศาสตร์':        'ku.ac.th',
  'ขอนแก่น':           'kku.ac.th',
  'นเรศวร':            'nu.ac.th',
  'สยาม':              'siam.edu',
  'กรุงเทพ':           'bu.ac.th',
  'รังสิต':            'rsu.ac.th',
  'อัสสัมชัญ':          'au.edu',
  'หอการค้าไทย':        'utcc.ac.th',
  'ศิลปากร':           'su.ac.th',
  'สถาบันเทคโนโลยีพระจอมเกล้า': 'kmitl.ac.th',
}

function getUniDomain(university: string): string | null {
  for (const [key, domain] of Object.entries(UNI_DOMAIN)) {
    if (university.includes(key)) return domain
  }
  return null
}

/* ============ University Abbreviation ============ */
// ตัวย่อทางการที่รู้จักทั่วไปของแต่ละสถาบัน (ใช้เป็น fallback เมื่อโหลด favicon ไม่ได้)
const UNI_ABBR: Record<string, string> = {
  'จุฬาลงกรณ์':         'CU',
  'ธรรมศาสตร์':         'TU',
  'มหิดล':             'MU',
  'มหาสารคาม':          'MSU',
  'เทคโนโลยีสุรนารี':   'SUT',
  'เชียงใหม่':          'CMU',
  'สงขลานครินทร์':      'PSU',
  'พระจอมเกล้าธนบุรี':  'KMUTT',
  'ลาดกระบัง':          'KMITL',
  'ศรีนครินทรวิโรฒ':    'SWU',
  'พระนครเหนือ':        'KMUTNB',
  'บูรพา':             'BUU',
  'สวนสุนันทา':         'SSRU',
  'อุบลราชธานี':        'UBU',
  'เกษตรศาสตร์':        'KU',
  'ขอนแก่น':           'KKU',
  'นเรศวร':            'NU',
  'สยาม':              'SIAM',
  'กรุงเทพ':           'BU',
  'รังสิต':            'RSU',
  'อัสสัมชัญ':          'ABAC',
  'หอการค้าไทย':        'UTCC',
  'ศิลปากร':           'SU',
}

function getUniAbbr(university: string): string {
  for (const [key, abbr] of Object.entries(UNI_ABBR)) {
    if (university.includes(key)) return abbr
  }
  // ไม่รู้จัก: ใช้อักษรไทยตัวแรก (ตัดคำนำหน้าทั่วไปออก) แทน
  return university.replace(/^(มหาวิทยาลัย|สถาบันเทคโนโลยี|สถาบัน)/, '').trim().charAt(0) || university.charAt(0)
}

/* ============ University Brand Color ============ */
// สีประจำมหาวิทยาลัยจริง (อ้างอิงจากประกาศ/หน้าเว็บทางการของแต่ละสถาบัน)
const UNI_COLOR: Record<string, string> = {
  'จุฬาลงกรณ์':          '#ec4899', // สีชมพู
  'ธรรมศาสตร์':          '#dc2626', // สีเหลือง-แดง
  'มหิดล':               '#2563eb', // สีน้ำเงิน
  'มหาสารคาม':           '#a16207', // สีเหลือง-เทา
  'เทคโนโลยีสุรนารี':     '#ea580c', // สีแสด-ทอง
  'เชียงใหม่':            '#7c3aed', // สีม่วงดอกรัก
  'สงขลานครินทร์':        '#1e40af', // สีน้ำเงิน
  'พระจอมเกล้าธนบุรี':    '#d97706', // สีแสด-เหลือง
  'ลาดกระบัง':            '#c2410c', // สีแสด
  'ศรีนครินทรวิโรฒ':      '#b91c1c', // สีเทา-แดง
  'พระนครเหนือ':          '#991b1b', // สีแดงหมากสุก
  'บูรพา':               '#57534e', // สีเทา-ทอง
  'สวนสุนันทา':           '#db2777', // สีน้ำเงิน-ชมพู
  'อุบลราชธานี':          '#eab308', // สีเหลือง
  'เกษตรศาสตร์':          '#16a34a', // สีเขียว
  'ขอนแก่น':             '#171717', // สีดำ-เหลือง
  'นเรศวร':              '#7c2d92', // สีม่วง
  'ศิลปากร':             '#059669', // สีเขียวเวอร์ริเดียน
}

function hashHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return hash % 360
}

function getUniColor(university: string): string {
  for (const [key, color] of Object.entries(UNI_COLOR)) {
    if (university.includes(key)) return color
  }
  // มหาวิทยาลัยที่ไม่มีในรายการ: สร้างสีที่คงที่เฉพาะตัว (สีเดิมทุกครั้งสำหรับชื่อเดิม)
  return `hsl(${hashHue(university)}, 60%, 42%)`
}

// ขนาดตัวอักษรของแบดจ์ ลดลงเมื่อตัวย่อยาวขึ้น เพื่อให้อ่านออกชัดเจนเสมอ
function abbrFontScale(len: number): number {
  if (len <= 2) return 0.40
  if (len === 3) return 0.34
  if (len === 4) return 0.28
  if (len === 5) return 0.23
  return 0.19
}

// มหาวิทยาลัยที่ Google favicon คืนไอคอนสำรองทั่วไปแบบ "โหลดสำเร็จ" (ไม่ error) เช่น วงกลมตัวอักษรเดียวลอย ๆ
// จึง onError ตรวจจับไม่ได้ว่าโลโก้จริงไม่มี — สำหรับกลุ่มนี้ใช้ไฟล์โลโก้จริงที่เก็บไว้ใน /public แทน
// (วางไฟล์ไว้ที่ public/<key>.png แล้วอ้างอิงด้วย path เริ่มต้นด้วย / ตรง ๆ)
const LOCAL_LOGO: Record<string, string> = {
  'สวนสุนันทา':          '/ssru.png',  // มหาวิทยาลัยราชภัฏสวนสุนันทา
  'อุบลราชธานี':          '/ubu.png',   // มหาวิทยาลัยอุบลราชธานี
  'พระจอมเกล้าธนบุรี':    '/kmutt.png', // มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี
  'เทคโนโลยีสุรนารี':      '/sut.png',   // มหาวิทยาลัยเทคโนโลยีสุรนารี
  'ลาดกระบัง':            '/kmitl.png', // สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง
}

function getLocalLogo(university: string): string | null {
  for (const [key, path] of Object.entries(LOCAL_LOGO)) {
    if (university.includes(key)) return path
  }
  return null
}

// ลำดับความสำคัญ: 1) ไฟล์โลโก้จริงที่เก็บไว้เอง (ชัวร์สุด ไม่พึ่งพาบริการภายนอก)
// 2) favicon จากเว็บมหาวิทยาลัย (เผื่อมหาวิทยาลัยอื่นที่ยังไม่มีไฟล์จริง)
// 3) แบดจ์ตัวย่อ+สีประจำมหาวิทยาลัย (fallback สุดท้าย กันไม่ให้ขึ้นว่างเปล่า)
function UniversityLogo({ university, logoUrl, size = 28 }: { university: string; logoUrl?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const localLogo = getLocalLogo(university)
  const domain = getUniDomain(university)
  const color = getUniColor(university)
  const abbr = getUniAbbr(university)
  const src = logoUrl || localLogo || (domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null)

  if (!src || imgError) return (
    <div
      title={university}
      style={{
        width: size, height: size, borderRadius: size * 0.28, background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * abbrFontScale(abbr.length), lineHeight: 1, fontWeight: 700,
        letterSpacing: -0.2, color: '#fff', flexShrink: 0, padding: '0 2px',
        boxShadow: `0 1px 3px rgba(0,0,0,0.18)`,
      }}
    >
      {abbr}
    </div>
  )

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={university}
      title={university}
      width={size} height={size}
      style={{
        width: size, height: size, maxWidth: size, maxHeight: size, minWidth: size, minHeight: size,
        borderRadius: size * 0.28, objectFit: 'contain', background: '#fff', border: `2px solid ${color}`, flexShrink: 0,
      }}
      onError={() => setImgError(true)}
    />
  )
}

export default function TrackerApp({ initialPrograms, suggestions, readOnly = false }: { initialPrograms: any[], suggestions: any, readOnly?: boolean }) {
  const [programs, setPrograms] = useState(initialPrograms)
  const router = useRouter()
  const params = useSearchParams()

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('theme') === 'dark'
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : '')
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // URL-backed state
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(() => {
    const f = params.get('filter')
    return f ? new Set(f.split(',').filter(Boolean)) : new Set()
  })
  const [search, setSearch] = useState(() => params.get('q') || '')
  const [sort, setSort] = useState(() => params.get('sort') || 'urgency')
  const [extraFilters, setExtraFilters] = useState(() => ({
    tcasFolio:    params.get('tcasFolio') === '1',
    hasInterview: params.get('hasInterview') === '1',
    starred:      params.get('starred') === '1',
  }))
  const [view, setView] = useState(() => params.get('view') || 'list')
  const [formOpen, setFormOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<any>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  // Sync state → URL (debounce-free, replace not push to avoid polluting history)
  const syncUrl = useCallback((overrides: Record<string, string | null> = {}) => {
    const p = new URLSearchParams()
    const cur = {
      view,
      q: search,
      sort: sort !== 'urgency' ? sort : null,
      filter: filterStatuses.size > 0 ? [...filterStatuses].join(',') : null,
      tcasFolio: extraFilters.tcasFolio ? '1' : null,
      hasInterview: extraFilters.hasInterview ? '1' : null,
      starred: extraFilters.starred ? '1' : null,
      ...overrides,
    }
    Object.entries(cur).forEach(([k, v]) => { if (v) p.set(k, v) })
    const newUrl = '?' + p.toString()
    if (window.location.search !== newUrl) {
      router.replace(newUrl, { scroll: false })
    }
  }, [view, search, sort, filterStatuses, extraFilters, router])

  useEffect(() => { syncUrl() }, [view, search, sort, filterStatuses, extraFilters]) // eslint-disable-line

  // Filtering & Sorting Logic
  const filteredPrograms = useMemo(() => {
    let list = programs.filter(p => {
      if (filterStatuses.size > 0 && !filterStatuses.has(p.status)) return false
      if (extraFilters.tcasFolio && !p.tcasFolio) return false
      if (extraFilters.hasInterview) {
        if (!isFullDate(p.interviewDate)) return false
        const feeIsPaid = !p.applicationFee || p.feePaid
        if (!feeIsPaid || (p.status !== 'ยื่นสมัครแล้ว' && p.status !== 'ติดสัมภาษณ์')) return false
      }
      if (extraFilters.starred && !(p.priority > 0)) return false
      if (!search) return true
      const hay = [p.university, p.faculty, p.major, p.curriculum, p.round, p.criteria, p.note].join(' ').toLowerCase()
      return hay.includes(search.trim().toLowerCase())
    })

    const urgencySort = (a: any, b: any) => {
      const ua = computeUrgency(a)
      const ub = computeUrgency(b)
      if (ua.sortRank !== ub.sortRank) return ua.sortRank - ub.sortRank
      const ka = ua.sortKey != null ? ua.sortKey : (ua.diffDays != null ? ua.diffDays : 9999)
      const kb = ub.sortKey != null ? ub.sortKey : (ub.diffDays != null ? ub.diffDays : 9999)
      return ka - kb
    }

    if (sort === 'name') {
      list.sort((a, b) => a.university.localeCompare(b.university, 'th'))
    } else if (sort === 'status') {
      list.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
    } else if (sort === 'priority') {
      list.sort((a, b) => {
        const ra = (a.priority && a.priority > 0) ? a.priority : 99
        const rb = (b.priority && b.priority > 0) ? b.priority : 99
        if (ra !== rb) return ra - rb
        return urgencySort(a, b)
      })
    } else {
      list.sort(urgencySort)
    }
    return list
  }, [programs, filterStatuses, extraFilters, search, sort])

  // Stats
  const urgentCount = programs.filter(p => computeUrgency(p).mode === 'urgent').length
  const awaitingCount = programs.filter(p => p.status === 'รอประกาศเกณฑ์').length
  const docsIncompleteCount = programs.filter(p => p.documents?.some((d: any) => !d.done)).length

  // Cost summary (ค่าสมัครรวม)
  const programsWithFee = programs.filter(p => p.applicationFee != null)
  const totalFee = programsWithFee.reduce((s, p) => s + p.applicationFee, 0)
  const paidFee = programsWithFee.filter(p => p.feePaid).reduce((s, p) => s + p.applicationFee, 0)
  const unpaidFee = totalFee - paidFee
  const unpaidPrograms = programsWithFee.filter(p => !p.feePaid)

  // Shared form styles
  const lbl: React.CSSProperties = { display:'block', fontSize:12.5, fontWeight:500, marginBottom:4, color:'var(--text-muted)' }
  const inp: React.CSSProperties = { width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:8, fontSize:13.5, boxSizing:'border-box' as const, background:'var(--surface)' }

  // Handlers
  const handleToggleStatusFilter = (status: string) => {
    setFilterStatuses(prev => {
      const next = new Set(prev)
      if (status === '__all__') next.clear()
      else {
        if (next.has(status)) next.delete(status)
        else next.add(status)
      }
      return next
    })
  }

  const handleToggleExtraFilter = (key: keyof typeof extraFilters) => {
    setExtraFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleOpenForm = (program: any = null) => {
    setEditingProgram(program)
    setFormOpen(true)
  }

  const handleDelete = (id: string) => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => toast.dismiss(t.id)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #ccc', background: 'transparent' }}>ยกเลิก</button>
          <button onClick={async () => {
            toast.dismiss(t.id)
            const loading = toast.loading('กำลังลบ...')
            await deleteProgram(id)
            // Compact priority gaps: if the deleted program had priority > 0,
            // shift all higher-priority programs down by 1
            let updatesToApply: { id: string; priority: number }[] = []
            setPrograms(prev => {
              updatesToApply = [] // reset in case of StrictMode double-invocation
              const deleted = prev.find(p => p.id === id)
              const deletedPriority = deleted?.priority || 0
              const remaining = prev.filter(p => p.id !== id)
              if (deletedPriority > 0) {
                const compacted = remaining.map(p => {
                  const pPriority = p.priority || 0
                  if (pPriority > deletedPriority) {
                    updatesToApply.push({ id: p.id, priority: pPriority - 1 })
                    return { ...p, priority: pPriority - 1 }
                  }
                  return p
                })
                return compacted
              }
              return remaining
            })
            if (updatesToApply.length > 0) setPriorities(updatesToApply)
            toast.success('ลบรายการสำเร็จ', { id: loading })
          }} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff' }}>ลบเลย</button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const handleToggleStar = (id: string) => {
    let message = ''
    let updatesToApply: { id: string; priority: number }[] = []

    setPrograms(prev => {
      updatesToApply = []
      const target = prev.find(p => p.id === id)
      if (!target) return prev

      const current = target.priority || 0
      let next: typeof prev

      if (current > 0) {
        // Un-star: set to 0, compact gaps for everything above
        next = prev.map(p => {
          const pP = p.priority || 0
          if (p.id === id) {
            updatesToApply.push({ id: p.id, priority: 0 })
            return { ...p, priority: 0 }
          }
          if (pP > current) {
            updatesToApply.push({ id: p.id, priority: pP - 1 })
            return { ...p, priority: pP - 1 }
          }
          return p
        })
        message = 'ยกเลิกอันดับที่ชอบ'
      } else {
        // Star: assign next available priority (max + 1)
        const maxP = Math.max(0, ...prev.map(p => p.priority || 0))
        const nextPriority = maxP + 1
        next = prev.map(p => {
          if (p.id === id) {
            updatesToApply.push({ id: p.id, priority: nextPriority })
            return { ...p, priority: nextPriority }
          }
          return p
        })
        message = `ตั้งเป็นอันดับที่ ${nextPriority}`
      }

      return next
    })

    if (message) toast.success(message)
    if (updatesToApply.length > 0) setPriorities(updatesToApply)
  }

  const handleQuickStatus = async (id: string, nextStatus: string) => {
    const loading = toast.loading('กำลังเปลี่ยนสถานะ...')
    await updateStatus(id, nextStatus)
    setPrograms(programs.map(p => p.id === id ? { ...p, status: nextStatus } : p))
    toast.success(`เปลี่ยนสถานะเป็น ${nextStatus}`, { id: loading })
  }

  const handleToggleFeePaid = async (id: string, paid: boolean) => {
    await setFeePaid(id, paid)
    setPrograms(programs.map(p => p.id === id ? { ...p, feePaid: paid } : p))
    if (paid) toast.success('ทำเครื่องหมายจ่ายค่าสมัครแล้ว')
  }

  const handleExportCSV = () => {
    const headers = ['มหาวิทยาลัย', 'คณะ', 'สาขา', 'หลักสูตร', 'รอบ', 'สถานะ', 'เปิดรับสมัคร', 'ปิดรับสมัคร', 'ประกาศผล', 'วันสัมภาษณ์', 'หมดเขตยืนยันสิทธิ์', 'เกณฑ์การคัดเลือก', 'ลิงก์ประกาศ', 'ค่าสมัคร']
    const rows = filteredPrograms.map(p => [
      p.university || '',
      p.faculty || '',
      p.major || '',
      p.curriculum || '',
      p.round || '',
      p.status || '',
      p.openDate ? formatDate(p.openDate) : '',
      p.closeDate ? formatDate(p.closeDate) : '',
      p.resultDate ? formatDate(p.resultDate) : '',
      p.interviewDate ? formatDate(p.interviewDate) : '',
      p.confirmationDate ? formatDate(p.confirmationDate) : '',
      p.criteria || '',
      p.link || '',
      p.applicationFee?.toString() || ''
    ])
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map((cell: any) => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TCAS_Tracker_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner !py-2.5 !px-4 sm:!py-4 sm:!px-5 !min-h-0">
          <div className="brand !gap-2 sm:!gap-[10px]">
            <img src="/icon-70.png" alt="TCAS Tracker" className="hidden sm:inline-flex" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain' }} />
            <div>
              <h1 className="!text-[16px] sm:!text-[19px]">TCAS Tracker</h1>
              <div className="tagline hidden sm:block">ติดตามการยื่นสมัคร Portfolio ทุกที่ ไม่ให้พลาดกำหนดการ</div>
            </div>
          </div>
          <div className="topbar-actions" style={{ display: 'flex', gap: 8 }}>
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(d => !d)}
              title={darkMode ? 'สลับโหมดสว่าง' : 'สลับโหมดมืด'}
              className="btn !w-[38px] !h-[38px] sm:!w-auto sm:!h-auto !p-0 sm:!px-[15px] sm:!py-[9px] !rounded-full flex justify-center items-center"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', fontSize: 16 }}
              aria-label={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button className="btn !w-[38px] !h-[38px] sm:!w-auto sm:!h-auto !p-0 sm:!px-[15px] sm:!py-[9px] !rounded-full flex justify-center items-center" onClick={handleExportCSV} style={{background: 'var(--surface-3)', border: '1px solid var(--border)'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[14px] sm:h-[14px]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span className="hidden sm:inline" style={{marginLeft: 6}}>ส่งออก CSV</span>
            </button>
            {!readOnly && (
              <button className="btn btn-primary !w-[38px] !h-[38px] sm:!w-auto sm:!h-auto !p-0 sm:!px-[15px] sm:!py-[9px] !rounded-full flex justify-center items-center" onClick={() => handleOpenForm()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="sm:w-[14px] sm:h-[14px]"><path d="M12 4v16M4 12h16"/></svg>
                <span className="hidden sm:inline">เพิ่มรายการ</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {!readOnly && (
        <>
          <section className="stats">
            <div className="stat-tile">
              <div className="stat-num num">{programs.length}</div>
              <div className="stat-label">รายการที่ติดตาม</div>
            </div>
            <div className="stat-tile" data-tone="danger">
              <div className="stat-num num">{urgentCount}</div>
              <div className="stat-label">ใกล้ปิดรับ (≤7 วัน)</div>
            </div>
            <div className="stat-tile" data-tone="warn">
              <div className="stat-num num">{awaitingCount}</div>
              <div className="stat-label">รอประกาศเกณฑ์</div>
            </div>
            <div className="stat-tile" data-tone="accent">
              <div className="stat-num num">{docsIncompleteCount}</div>
              <div className="stat-label">เอกสารยังไม่ครบ</div>
            </div>
          </section>

          {programsWithFee.length > 0 && (
            <div className="cost-panel">
              <div className="cost-item"><span>ค่าสมัครรวมทั้งหมด</span><b>{totalFee.toLocaleString('th-TH')} บาท</b></div>
              <div className="cost-item"><span>จ่ายแล้ว</span><b style={{ color: 'var(--success)' }}>{paidFee.toLocaleString('th-TH')} บาท</b></div>
              <div className="cost-item"><span>ค้างจ่าย</span><b style={{ color: unpaidFee > 0 ? 'var(--danger)' : 'var(--text)' }}>{unpaidFee.toLocaleString('th-TH')} บาท</b></div>
              <div className="cost-item"><span>จำนวนรายการที่ระบุค่าสมัคร</span><b>{programsWithFee.length} / {programs.length}</b></div>
            </div>
          )}

          {unpaidPrograms.length > 0 && (
            <div style={{ marginTop: 12, marginBottom: 8, padding: 16, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} />
                รายการค้างชำระ ({unpaidPrograms.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ display: 'grid', gap: 8 }}>
                {unpaidPrograms.map(p => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.university}</span>
                      {p.major && <span style={{ color: 'var(--text-muted)', fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{p.major}</span>}
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--danger)', flexShrink: 0 }}>
                      {p.applicationFee.toLocaleString('th-TH')} ฿
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="view-tabs" role="tablist">
            <button className="view-tab" aria-pressed={view === 'list'} onClick={() => setView('list')}>รายการ</button>
            <button className="view-tab" aria-pressed={view === 'compare'} onClick={() => setView('compare')}>เปรียบเทียบ</button>
            <button className="view-tab" aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>ไทม์ไลน์</button>
          </div>
        </>
      )}

      {(view === 'list' || readOnly) && (
        <>
          <div className="toolbar">
            <div className="search-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="text" className="search-input" placeholder="ค้นหามหาวิทยาลัย คณะ สาขา รอบที่สมัคร..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="urgency">เรียง: ปิดรับเร็วสุดก่อน</option>
              <option value="priority">เรียง: อันดับที่ชอบก่อน</option>
              <option value="name">เรียง: ชื่อมหาวิทยาลัย ก-ฮ</option>
              <option value="status">เรียง: สถานะ</option>
            </select>
          </div>

          {!readOnly && (
            <div className="toolbar" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>สถานะ:</span>
                <select 
                  className="sort-select" 
                  value={filterStatuses.size === 0 ? '__all__' : [...filterStatuses][0]} 
                  onChange={e => setFilterStatuses(e.target.value === '__all__' ? new Set() : new Set([e.target.value]))}
                  style={{ minWidth: 160 }}
                >
                  <option value="__all__">ทั้งหมด</option>
                  {STATUS_ORDER.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>ตัวกรอง:</span>
                <div className="filter-chips" style={{ marginBottom: 0 }}>
                  <button className="chip" aria-pressed={extraFilters.tcasFolio} onClick={() => handleToggleExtraFilter('tcasFolio')}>TCASFolio</button>
                  <button className="chip" aria-pressed={extraFilters.hasInterview} onClick={() => handleToggleExtraFilter('hasInterview')}>มีนัดสัมภาษณ์แล้ว</button>
                  <button className="chip" aria-pressed={extraFilters.starred} onClick={() => handleToggleExtraFilter('starred')}><Star size={14} fill="currentColor" /> ปักดาว</button>
                </div>
              </div>
            </div>
          )}

          {/* TERMINAL statuses — collapsed by default */}
          {(() => {
            const TERMINAL = ['ยืนยันสิทธิ์แล้ว', 'ไม่ผ่านการคัดเลือก', 'สละสิทธิ์', 'ยกเลิก/ไม่ยื่น']
            const activePrograms    = filteredPrograms.filter(p => !TERMINAL.includes(p.status))
            const completedPrograms = filteredPrograms.filter(p =>  TERMINAL.includes(p.status))

            const renderCard = (p: any) => {
              const u = computeUrgency(p)
              const docsTotal = p.documents?.length || 0
              const docsDone  = p.documents?.filter((d: any) => d.done).length || 0
              const docsPct   = docsTotal > 0 ? Math.round((docsDone / docsTotal) * 100) : null
              const docsColor = docsTotal > 0 && docsDone === docsTotal ? 'var(--success)' : docsDone > 0 ? '#f59e0b' : 'var(--surface-3)'

              return (
                <article key={p.id} className="card" style={{ borderTop: `3px solid ${getUniColor(p.university)}` }}>
                  <div className="card-urgency" data-tone={u.tone}>
                    {u.sortKey != null ? (
                      <><div className="u-num num">{u.diffDays}</div><div className="u-label">{u.dateLabel || 'วันที่เหลือ'}</div></>
                    ) : (
                      <div className="u-label" style={{ fontSize: 12.5 }}>{u.label}</div>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="card-head">
                      <div className="card-title-group" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <UniversityLogo university={p.university} logoUrl={p.logoUrl} size={32} />
                        <div>
                          <div className="card-uni">{p.university}</div>
                          <div className="card-sub">{[p.faculty, p.major, p.curriculum].filter(Boolean).join(' · ')}</div>
                        </div>
                      </div>
                      <div className="card-actions">
                        {!readOnly && (
                          <>
                            <button className="star-btn" data-active={p.priority > 0} 
                              style={p.priority > 0 ? { padding: '4px 10px', fontSize: 13, fontWeight: 700, gap: 4 } : {}}
                              onClick={() => handleToggleStar(p.id)}>
                              {p.priority > 0 ? `★ ${p.priority}` : '★'}
                            </button>
                            <button className="btn btn-ghost btn-icon" onClick={() => handleOpenForm(p)}><Edit2 size={16} /></button>
                            <button className="btn btn-danger-ghost btn-icon" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="badge-row">
                      {p.priority > 0 && !readOnly && <span className="badge" data-tone="warn"><Star size={14} fill="currentColor" /> อันดับที่ชอบ {p.priority}</span>}
                      {p.round && <span className="badge">{p.round}</span>}
                      {readOnly ? null : (
                        <select 
                          className="badge" 
                          data-tone={STATUS_META[p.status]?.color || 'neutral'}
                          value={p.status}
                          onChange={(e) => handleQuickStatus(p.id, e.target.value)}
                          style={{ cursor: 'pointer', outline: 'none', appearance: 'none', paddingRight: 24, backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" stroke="gray" stroke-width="3" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', fontFamily: 'inherit' }}
                        >
                          {STATUS_ORDER.map(s => {
                            let disabled = false;
                            if (s === 'ยื่นสมัครแล้ว' || s === 'ติดสัมภาษณ์' || s === 'รอยืนยันสิทธิ์' || s === 'ยืนยันสิทธิ์แล้ว') {
                              if (isFullDate(p.openDate) && new Date(todayISO() + 'T00:00:00') < new Date(p.openDate + 'T00:00:00')) {
                                disabled = true;
                              }
                            }
                            if (p.status === 'ยื่นสมัครแล้ว' && (s === 'ยังไม่เปิดรับสมัคร' || s === 'รอยื่นสมัคร')) disabled = true;
                            if (p.status === 'ติดสัมภาษณ์' && (s === 'ยังไม่เปิดรับสมัคร' || s === 'รอยื่นสมัคร' || s === 'ยื่นสมัครแล้ว')) disabled = true;

                            return <option key={s} value={s} disabled={disabled} style={{ color: disabled ? 'var(--text-faint)' : 'var(--text)', background: 'var(--bg)' }}>{s}</option>
                          })}
                        </select>
                      )}
                      {p.tcasFolio && <span className="badge" data-tone="accent">ใช้ TCASFolio</span>}
                      {p.submissionSystem && <span className="badge" data-tone="accent">ระบบ: {p.submissionSystem}</span>}
                      
                      {p.applicationFee != null && p.applicationFee > 0 && !readOnly && (
                        p.feePaid ? (
                          <span className="badge" data-tone="success"><Check size={14} /> จ่ายค่าสมัครแล้ว</span>
                        ) : (
                          <>
                            <span className="badge" data-tone="danger"><X size={14} /> ยังไม่จ่ายค่าสมัคร ({p.applicationFee} ฿)</span>
                            <button className="status-quick-btn" data-tone="success" onClick={() => handleToggleFeePaid(p.id, true)}>จ่ายแล้ว</button>
                          </>
                        )
                      )}
                    </div>
                    <div className="date-row">
                      {!(isFullDate(p.openDate) && new Date(todayISO() + 'T00:00:00') >= new Date(p.openDate + 'T00:00:00')) && (
                        <div className="date-item"><b>เปิดรับ</b><span>{formatDate(p.openDate)}</span></div>
                      )}
                      <div className="date-item"><b>ปิดรับ</b><span>{formatDate(p.closeDate)}</span></div>
                      <div className="date-item"><b>ประกาศผล</b><span>{formatDate(p.resultDate)}</span></div>
                      {isFullDate(p.interviewDate) && (
                        <div className="date-item"><b>สัมภาษณ์</b><span>{formatDate(p.interviewDate)}</span></div>
                      )}
                    </div>

                    {/* Document progress bar — inline, always visible */}
                    {docsTotal > 0 && !readOnly && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${docsPct}%`, background: docsColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
                        </div>
                        <span style={{ fontSize: 11.5, color: docsDone === docsTotal ? 'var(--success)' : 'var(--text-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {docsDone}/{docsTotal} เอกสาร
                        </span>
                      </div>
                    )}
                    
                    {!readOnly && (
                      <details className="more" style={{ marginTop: 12 }}>
                        <summary><svg className="chev" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 6 6 6-6 6"/></svg> รายละเอียดเพิ่มเติม</summary>
                        
                        
                        {p.requirements && p.requirements.length > 0 && (
                          <div className="detail-section" style={{marginTop: 12}}>
                            <h4 style={{ fontSize: 12, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>เกณฑ์ขั้นต่ำ</h4>
                            <div className="doc-list" style={{ fontSize: 13.5 }}>
                              {p.requirements.map((req: any, i: number) => (
                                req.label ? <div key={i} className="doc-item"><span><b>{req.label}:</b> {req.value || '-'}</span></div> : null
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="detail-section" style={{ marginTop: 8 }}>
                          <h4 style={{ fontSize: 12, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>สัดส่วนคะแนน</h4>
                          <CriteriaBars criteria={p.criteria || ''} />
                        </div>

                        {isFullDate(p.interviewDate) && (
                          <div className="detail-section" style={{marginTop: 12}}>
                            <h4 style={{ fontSize: 12, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>ข้อมูลสัมภาษณ์</h4>
                            <div className="doc-list" style={{ fontSize: 13.5 }}>
                              <div className="doc-item"><span><b>วันที่:</b> {formatDate(p.interviewDate)}</span></div>
                              <div className="doc-item"><span><b>รูปแบบ:</b> {INTERVIEW_FORMAT_LABEL[p.interviewFormat] || p.interviewFormat || '-'}</span></div>
                              <div className="doc-item"><span><b>สถานที่:</b> {p.interviewPlace || '-'}</span></div>
                            </div>
                          </div>
                        )}

                        {p.documents && p.documents.length > 0 && (
                          <div className="detail-section" style={{marginTop: 12}}>
                            <h4 style={{ fontSize: 12, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>เอกสารที่ต้องใช้</h4>
                            <div className="doc-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {p.documents.map((doc: any) => (
                                <label key={doc.id} className="doc-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: readOnly ? 'default' : 'pointer', fontSize: 13.5 }}>
                                  {!readOnly && (
                                    <input type="checkbox" checked={doc.done} onChange={(e) => {
                                      toggleDocument(doc.id, e.target.checked)
                                      setPrograms(programs.map(pr => pr.id === p.id ? { ...pr, documents: pr.documents.map((d: any) => d.id === doc.id ? { ...d, done: e.target.checked } : d) } : pr))
                                      if (e.target.checked) toast.success('เตรียมเอกสารนี้แล้ว')
                                    }} style={{ marginTop: 2, accentColor: 'var(--text)' }} />
                                  )}
                                  <span style={{ textDecoration: doc.done && !readOnly ? 'line-through' : 'none', color: doc.done && !readOnly ? 'var(--text-faint)' : 'inherit' }}>{doc.text}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="detail-section" style={{marginTop: 12}}>
                          <div style={{display:'flex', gap: 8, flexWrap: 'wrap', marginBottom: p.note ? 4 : 0}}>
                            <a href={p.admissionLink || getAdmissionUrl(p.university)} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex', padding:'4px 10px', fontSize:12, borderRadius:4, textDecoration:'none', backgroundColor:'#10b981', color:'#fff', fontWeight: 500}}><Building size={14} /> ระบบ Admission</a>
                            {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex', padding:'4px 10px', fontSize:12, borderRadius:4, textDecoration:'none', backgroundColor:'var(--text)', color:'#fff', fontWeight: 500}}><ExternalLink size={14} /> ดูประกาศฉบับเต็ม</a>}
                          </div>
                          {p.note && <div style={{marginTop: 8, fontSize: 13.5, color: 'var(--text-muted)'}}><b>บันทึก:</b> {p.note}</div>}
                        </div>
                      </details>
                    )}
                  </div>
                </article>
              )
            }

            return (
              <>
                <div className="result-count">พบ {filteredPrograms.length} รายการ{completedPrograms.length > 0 ? ` (กำลังดำเนินการ ${activePrograms.length} / เสร็จแล้ว ${completedPrograms.length})` : ''}</div>

                {/* Active programs */}
                <div className="card-list">
                  {activePrograms.map(renderCard)}
                  {activePrograms.length === 0 && filteredPrograms.length > 0 && (
                    <div className="empty-state" style={{ padding: '24px 0' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>ไม่มีรายการที่กำลังดำเนินการ</div>
                    </div>
                  )}
                </div>

                {/* Completed programs — collapsible */}
                {completedPrograms.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <button
                      onClick={() => setShowCompleted(v => !v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)',
                        background: 'var(--surface-2)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        color: 'var(--text-muted)', fontFamily: 'inherit',
                        transition: 'background 0.15s',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                        style={{ transform: showCompleted ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}>
                        <path d="m9 6 6 6-6 6"/>
                      </svg>
                      รายการที่เสร็จสิ้นแล้ว ({completedPrograms.length} รายการ)
                      <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 400, opacity: 0.7 }}>
                        {showCompleted ? 'คลิกเพื่อพับ' : 'คลิกเพื่อดู'}
                      </span>
                    </button>
                    {showCompleted && (
                      <div className="card-list" style={{ marginTop: 10, animation: 'fadeSlideUp 0.25s ease both', opacity: 0.75 }}>
                        {completedPrograms.map(renderCard)}
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          })()}
        </>
      )}

      {/* Basic implementations for compare & timeline can go here */}
      {!readOnly && view === 'compare' && <CompareView programs={programs} />}
      {!readOnly && view === 'timeline' && <TimelineView programs={filteredPrograms} />}

      {formOpen && (
        <ProgramFormModal
          suggestions={suggestions}
          editingProgram={editingProgram}
          onClose={() => setFormOpen(false)}
          onSave={async (data) => {
            const loading = toast.loading('กำลังบันทึกข้อมูล...')
            if (editingProgram) {
              const updatedProgram = await updateProgram(editingProgram.id, data)
              setPrograms(programs.map(p => {
                if (p.id === editingProgram.id) {
                  return { ...p, ...updatedProgram }
                }
                if (data.university && p.university === data.university && updatedProgram.logoUrl !== undefined) {
                  return { ...p, logoUrl: updatedProgram.logoUrl }
                }
                return p
              }))
              toast.success('แก้ไขข้อมูลเรียบร้อย', { id: loading })
            } else {
              const newProgram = await createProgram(data)
              setPrograms([...programs, newProgram].map(p => {
                if (newProgram.university && p.university === newProgram.university && newProgram.logoUrl) {
                  return { ...p, logoUrl: newProgram.logoUrl };
                }
                return p;
              }))
              toast.success('เพิ่มรายการใหม่เรียบร้อย', { id: loading })
            }
            setFormOpen(false)
          }}
        />
      )}
    </div>
  )
}

/* ===================== TimelineView ===================== */

const LABEL_TONE: Record<string, string> = {
  'เปิดรับสมัคร':       '#10b981',
  'ปิดรับสมัคร':        '#ef4444',
  'ประกาศผล':           '#6366f1',
  'สัมภาษณ์':          '#f59e0b',
  'หมดเขตยืนยันสิทธิ์': '#10b981',
}

const THAI_MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

type TlEvent = {
  id: string
  program: any
  date: string        // sortable: yyyy-mm-dd or yyyy-mm-01 for month-only
  dateDisplay: string // original value
  isMonthOnly: boolean
  label: string
}

function TimelineView({ programs }: { programs: any[] }) {
  const today = new Date().toISOString().slice(0, 10)
  const [showPast, setShowPastRaw] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('tl_showPast')
    return saved === '1' // default false (ซ่อนวันที่ผ่านมาแล้ว)
  })
  const setShowPast = (v: boolean) => {
    localStorage.setItem('tl_showPast', v ? '1' : '0')
    setShowPastRaw(v)
  }

  const events: TlEvent[] = []
  const undated: any[] = []

  for (const p of programs) {
    const addEvent = (raw: string | null | undefined, label: string) => {
      if (!raw) return
      const isFullDay = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      const isMonth   = /^\d{4}-\d{2}$/.test(raw)
      if (!isFullDay && !isMonth) return
      events.push({
        id: `${p.id}-${label}`,
        program: p,
        date: isFullDay ? raw : raw + '-01',
        dateDisplay: raw,
        isMonthOnly: isMonth,
        label,
      })
    }
    addEvent(p.openDate,          'เปิดรับสมัคร')
    addEvent(p.closeDate, 'ปิดรับสมัคร')
    addEvent(p.interviewEligibleDate, 'ประกาศมีสิทธิ์สัมภาษณ์')
    addEvent(p.resultDate,        'ประกาศผล')
    addEvent(p.interviewDate,     'สัมภาษณ์')
    addEvent(p.confirmationDate,  'หมดเขตยืนยันสิทธิ์')

    const hasAnyDate = [p.openDate, p.closeDate, p.resultDate, p.interviewDate, p.confirmationDate].some(d => d && /^\d{4}-\d{2}/.test(d))
    if (!hasAnyDate) undated.push(p)
  }

  const visibleEvents = showPast ? events : events.filter(e => e.date >= today)
  visibleEvents.sort((a, b) => a.date.localeCompare(b.date))

  // Group by month
  const grouped: Record<string, TlEvent[]> = {}
  for (const ev of visibleEvents) {
    const key = ev.date.slice(0, 7)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(ev)
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {Object.entries(LABEL_TONE).map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        {/* Toggle past */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer', color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} style={{ accentColor: 'var(--text)' }} />
          แสดงวันที่ผ่านมาแล้ว
        </label>
      </div>

      {visibleEvents.length === 0 && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-faint)' }}>ไม่มีกำหนดการในช่วงนี้</div>
      )}

      {/* Timeline */}
      {Object.entries(grouped).map(([monthKey, evs], mi) => {
        const [year, month] = monthKey.split('-')
        const monthLabel = `${THAI_MONTHS_FULL[parseInt(month)-1]} ${parseInt(year)+543}`
        const isCurrentMonth = monthKey === today.slice(0, 7)

        return (
          <div key={monthKey} style={{ display: 'flex', gap: 0, animation: `fadeSlideUp 0.3s ease ${mi*0.06}s both` }}>
            {/* Month column */}
            <div style={{ width: 96, flexShrink: 0, paddingTop: 2, paddingRight: 14, textAlign: 'right' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: isCurrentMonth ? '#ef4444' : 'var(--text)', lineHeight: 1.4, position: 'sticky', top: 12 }}>
                {isCurrentMonth && <span style={{ display: 'block', fontSize: 10, color: '#ef4444', letterSpacing: 0.5, marginBottom: 1 }}>● เดือนนี้</span>}
                {monthLabel}
              </div>
            </div>

            {/* Line + events */}
            <div style={{ flex: 1, borderLeft: `2px solid ${isCurrentMonth ? '#ef444455' : 'var(--border)'}`, paddingLeft: 20, paddingBottom: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {evs.map((ev, ei) => {
                const p = ev.program
                const isPast = ev.date < today
                const isToday = ev.date === today
                const dotColor = LABEL_TONE[ev.label] || '#999'
                const dayNum = ev.isMonthOnly ? null : parseInt(ev.dateDisplay.slice(8))
                const docsTotal = p.documents?.length || 0
                const docsDone  = p.documents?.filter((d: any) => d.done).length || 0
                const statusMeta = STATUS_META[p.status]

                return (
                  <div key={ev.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', animation: `slideInRight 0.25s ease ${mi*0.06 + ei*0.04}s both` }}>
                    {/* Dot */}
                    <div style={{
                      marginLeft: -29, marginTop: 5, width: 14, height: 14, flexShrink: 0,
                      borderRadius: '50%', background: isPast ? '#ccc' : dotColor,
                      border: '2.5px solid var(--surface)',
                      boxShadow: isToday ? `0 0 0 4px ${dotColor}44` : 'none',
                    }} />

                    {/* Card */}
                    <div style={{
                      flex: 1, borderRadius: 10,
                      border: `1px solid ${isPast ? 'var(--border)' : dotColor + '44'}`,
                      background: isPast ? 'var(--surface-2)' : 'var(--surface)',
                      padding: '10px 14px',
                      opacity: isPast ? 0.6 : 1,
                    }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: dotColor + '22', color: dotColor }}>
                            {ev.label}
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--text-faint)', fontWeight: 500 }}>
                            {dayNum ? `${dayNum} ${THAI_MONTHS_FULL[parseInt(month)-1]} ${parseInt(year)+543}` : `${THAI_MONTHS_FULL[parseInt(month)-1]} ${parseInt(year)+543} (โดยประมาณ)`}
                          </span>
                          {isToday && <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', animation: 'fadeIn 0.5s ease infinite alternate' }}>● วันนี้!</span>}
                        </div>
                        {/* Status badge */}
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, flexShrink: 0,
                          background: `var(--tone-${statusMeta?.color || 'neutral'}-bg, var(--surface-3))`,
                          color: `var(--tone-${statusMeta?.color || 'neutral'}, var(--text-muted))`,
                          border: '1px solid var(--border)',
                        }}>
                          {p.status}
                        </span>
                      </div>

                      {/* Program name */}
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)', marginTop: 6 }}>{p.university}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                        {[p.faculty, p.major].filter(Boolean).join(' · ')}
                      </div>

                      {/* Extra info per event type */}
                      {ev.label === 'ปิดรับสมัคร' && docsTotal > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(docsDone/docsTotal)*100}%`, background: docsDone === docsTotal ? '#10b981' : '#f59e0b', borderRadius: 99, transition: 'width 0.4s ease' }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                            เอกสาร {docsDone}/{docsTotal}
                          </span>
                        </div>
                      )}

                      {ev.label === 'สัมภาษณ์' && (p.interviewFormat || p.interviewPlace) && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {p.interviewFormat && <span><MapPin size={14} /> {p.interviewFormat === 'onsite' ? 'Onsite' : 'Online'}</span>}
                          {p.interviewPlace  && <span><Building size={14} /> {p.interviewPlace}</span>}
                        </div>
                      )}

                      {ev.label === 'ปิดรับสมัคร' && (p.tcasFolio || p.submissionSystem) && (
                        <div style={{ marginTop: 6, fontSize: 11.5, color: '#6366f1', fontWeight: 500 }}><Paperclip size={14} /> ต้องใช้ {p.submissionSystem || (p.tcasFolio ? 'TCASFolio' : '')}</div>
                      )}

                      {p.note && ev.label === 'เปิดรับสมัคร' && (
                        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-faint)', borderLeft: '2px solid var(--border)', paddingLeft: 8 }}>{p.note}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Undated section */}
      {undated.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary style={{ fontSize: 13, color: 'var(--text-faint)', cursor: 'pointer', padding: '8px 0' }}>
            <AlertTriangle size={14} /> รายการที่ยังไม่ระบุกำหนดการ ({undated.length} รายการ)
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {undated.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 13 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>{p.university}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{p.major || p.faculty}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 4 }}>{p.status}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

/* ===================== CompareView ===================== */

function CompareView({ programs }: { programs: any[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 4 ? [...prev, id] : prev
    )
  }

  const picked = programs.filter(p => selected.includes(p.id))

  const ROW_DEFS: { label: string; render: (p: any) => React.ReactNode }[] = [
    { label: 'คณะ', render: p => p.faculty || '—' },
    { label: 'สาขา', render: p => p.major || '—' },
    { label: 'หลักสูตร', render: p => <span style={{ fontSize: 12 }}>{p.curriculum || '—'}</span> },
    { label: 'รอบ', render: p => p.round || '—' },
    { label: 'สถานะ', render: p => (
      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
        background: `var(--tone-${STATUS_META[p.status]?.color || 'neutral'}-bg, var(--surface-2))`,
        color: `var(--tone-${STATUS_META[p.status]?.color || 'neutral'}, var(--text))` }}>
        {p.status}
      </span>
    )},
    { label: 'เปิดรับสมัคร', render: p => formatDate(p.openDate) },
    { label: 'ปิดรับสมัคร', render: p => {
      const d = formatDate(p.closeDate)
      const urgent = p.closeDate && p.closeDate >= new Date().toISOString().slice(0,10)
        && (new Date(p.closeDate).getTime() - new Date().getTime()) / 86400000 <= 7
      return <span style={{ color: urgent ? '#ef4444' : 'inherit', fontWeight: urgent ? 700 : 400 }}>{d}</span>
    }},
    { label: 'ประกาศผล', render: p => formatDate(p.resultDate) },
    { label: 'ค่าสมัคร', render: p => p.applicationFee != null
      ? <span>{p.applicationFee.toLocaleString('th-TH')} บาท <span style={{ fontSize: 11, color: p.feePaid ? 'var(--success)' : 'var(--text-faint)' }}>({p.feePaid ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'})</span></span>
      : '—'
    },
    { label: 'TCASFolio', render: p => p.tcasFolio ? '<Check size={14} /> ใช้ TCASFolio' : '—' },
    { label: 'เกณฑ์ขั้นต่ำ', render: (p: any) => p.requirements && p.requirements.length 
      ? <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5 }}>
          {p.requirements.map((r: any, i: number) => r.label ? <li key={i}><b>{r.label}:</b> {r.value || '-'}</li> : null)}
        </ul>
      : '—'
    },
    { label: 'สัดส่วนคะแนน', render: p => <CriteriaBars criteria={p.criteria || ''} /> },
    { label: 'เอกสาร', render: p => p.documents?.length
      ? <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5 }}>
          {p.documents.map((d: any) => <li key={d.id} style={{ textDecoration: d.done ? 'line-through' : 'none', color: d.done ? 'var(--text-faint)' : 'inherit' }}>{d.text}</li>)}
        </ul>
      : '—'
    },
    { label: 'บันทึก', render: p => p.note ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.note}</span> : '—' },
  ]

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Selector */}
      <div style={{ marginBottom: 24, padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>เลือกรายการที่ต้องการเปรียบเทียบ (สูงสุด 4 รายการ)</span>
          <span style={{ fontWeight: 600, color: selected.length === 4 ? 'var(--danger)' : 'var(--accent)' }}>{selected.length}/4</span>
        </div>

        {/* Selected Items */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: selected.length > 0 ? 16 : 0 }}>
          {picked.map(p => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              style={{
                padding: '6px 12px', borderRadius: 999, border: '1px solid var(--text)',
                background: 'var(--text)', color: 'var(--bg)',
                fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                animation: 'fadeSlideUp 0.2s ease both',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: getUniColor(p.university), flexShrink: 0 }} />
              {p.university} · {p.major || p.faculty}
              <span style={{ opacity: 0.6 }}>✕</span>
            </button>
          ))}
        </div>

        {/* Search to add more */}
        {selected.length < 4 && (
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="ค้นหามหาวิทยาลัย หรือคณะ/สาขา เพื่อเพิ่ม..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg)', fontSize: 13.5, color: 'var(--text)', marginBottom: 8,
                transition: 'all 0.15s'
              }}
            />
            
            <div style={{ 
              display: 'flex', flexDirection: 'column', gap: 4, 
              maxHeight: 220, overflowY: 'auto', 
              borderRadius: 8, background: 'var(--bg)',
              border: '1px solid var(--border)'
            }}>
              {programs
                .filter(p => !selected.includes(p.id))
                .filter(p => !searchQuery || `${p.university} ${p.faculty} ${p.major}`.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((p, i, arr) => (
                <button
                  key={p.id}
                  onClick={() => { toggle(p.id); setSearchQuery('') }}
                  style={{
                    padding: '10px 14px', textAlign: 'left', border: 'none',
                    borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.university}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.faculty} · {p.major}</div>
                </button>
              ))}
              {programs.filter(p => !selected.includes(p.id) && `${p.university} ${p.faculty} ${p.major}`.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <div style={{ padding: '16px', fontSize: 13, color: 'var(--text-faint)', textAlign: 'center' }}>
                  ไม่พบรายการที่ค้นหา
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Compare table */}
      {picked.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-faint)' }}>
          ยังไม่ได้เลือกรายการ — กดปุ่มด้านบนเพื่อเริ่มเปรียบเทียบ
        </div>
      )}

      {picked.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13.5 }}>
            <colgroup>
              <col style={{ width: 120 }} />
              {picked.map(p => <col key={p.id} style={{ width: `${Math.floor(80 / picked.length)}%` }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: 'var(--text-faint)', background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}></th>
                {picked.map((p, i) => (
                  <th key={p.id} style={{ padding: '10px 12px', textAlign: 'left', background: 'var(--surface-2)', borderBottom: '2px solid var(--border)', borderTop: `3px solid ${getUniColor(p.university)}`, animation: `slideInRight 0.3s ease ${i*0.07}s both` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <UniversityLogo university={p.university} logoUrl={p.logoUrl} size={26} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.university}</div>
                        <div style={{ fontWeight: 400, fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{p.major || p.faculty}</div>
                      </div>
                    </div>
                    <button onClick={() => toggle(p.id)} style={{ marginTop: 6, fontSize: 11, padding: '1px 7px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-faint)' }}>ลบออก ✕</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROW_DEFS.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-faint)', verticalAlign: 'top', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                    {row.label}
                  </td>
                  {picked.map(p => (
                    <td key={p.id} style={{ padding: '10px 12px', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>
                      {row.render(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
