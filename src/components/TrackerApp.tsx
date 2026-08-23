'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { STATUS_META, STATUS_ORDER, NEXT_STATUS, INTERVIEW_FORMAT_LABEL } from '@/lib/constants'
import { computeUrgency, formatDate, isFullDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { createProgram, updateProgram, deleteProgram, toggleDocument, setPriority, updateStatus, setFeePaid } from '@/app/actions'
import ProgramFormModal from './ProgramFormModal'

// Parse "Portfolio 100%, GPAX 10%, Interview 50%" → [{label, pct}]
function parseCriteria(text: string): { label: string; pct: number }[] {
  if (!text) return []
  const re = /([^,;%\d]+?)\s*(\d{1,3}(?:\.\d+)?)\s*%/g
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

/* ============ University Logo ============ */
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

function UniversityLogo({ university, size = 28 }: { university: string; size?: number }) {
  const domain = getUniDomain(university)
  if (!domain) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, fontWeight: 700, color: 'var(--text-faint)', flexShrink: 0 }}>
      {university.charAt(0)}
    </div>
  )
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?sz=64&domain=${domain}`}
      alt={university}
      width={size} height={size}
      style={{ borderRadius: '50%', objectFit: 'contain', background: '#fff', border: '1px solid var(--border)', flexShrink: 0 }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

export default function TrackerApp({ initialPrograms, suggestions }: { initialPrograms: any[], suggestions: any }) {
  const [programs, setPrograms] = useState(initialPrograms)
  const router = useRouter()
  const params = useSearchParams()

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
    router.replace('?' + p.toString(), { scroll: false })
  }, [view, search, sort, filterStatuses, extraFilters, router])

  useEffect(() => { syncUrl() }, [view, search, sort, filterStatuses, extraFilters]) // eslint-disable-line

  // Filtering & Sorting Logic
  const filteredPrograms = useMemo(() => {
    let list = programs.filter(p => {
      if (filterStatuses.size > 0 && !filterStatuses.has(p.status)) return false
      if (extraFilters.tcasFolio && !p.tcasFolio) return false
      if (extraFilters.hasInterview && !isFullDate(p.interviewDate)) return false
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
            setPrograms(programs.filter(p => p.id !== id))
            toast.success('ลบรายการสำเร็จ', { id: loading })
          }} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff' }}>ลบเลย</button>
        </div>
      </div>
    ), { duration: Infinity })
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

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">T</span>
            <div>
              <h1>TCAS Tracker</h1>
              <div className="tagline">ติดตามการยื่นสมัคร Portfolio ทุกที่ ไม่ให้พลาดกำหนดการ</div>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-primary" onClick={() => handleOpenForm()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 4v16M4 12h16"/></svg>
              เพิ่มรายการ
            </button>
          </div>
        </div>
      </header>

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
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600 }}>ยังไม่จ่าย:</span>
          {unpaidPrograms.map(p => (
            <span
              key={p.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 9px', borderRadius: 999, fontSize: 12.5, fontWeight: 500,
                background: 'var(--danger-soft)', color: 'var(--danger)',
              }}
            >
              {p.university}{p.major ? ` · ${p.major}` : ''}
              <b style={{ fontWeight: 700 }}>{p.applicationFee.toLocaleString('th-TH')} บาท</b>
            </span>
          ))}
        </div>
      )}

      <div className="view-tabs" role="tablist">
        <button className="view-tab" aria-pressed={view === 'list'} onClick={() => setView('list')}>รายการ</button>
        <button className="view-tab" aria-pressed={view === 'compare'} onClick={() => setView('compare')}>เปรียบเทียบ</button>
        <button className="view-tab" aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>ไทม์ไลน์</button>
      </div>

      {view === 'list' && (
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

          <div className="filter-chips">
            <button className="chip" aria-pressed={filterStatuses.size === 0} onClick={() => handleToggleStatusFilter('__all__')}>ทั้งหมด</button>
            {STATUS_ORDER.map(status => (
              <button key={status} className="chip" aria-pressed={filterStatuses.has(status)} onClick={() => handleToggleStatusFilter(status)}>{status}</button>
            ))}
          </div>
          
          <div className="filter-chips">
            <button className="chip" aria-pressed={extraFilters.tcasFolio} onClick={() => handleToggleExtraFilter('tcasFolio')}>ต้องใช้ TCASFolio</button>
            <button className="chip" aria-pressed={extraFilters.hasInterview} onClick={() => handleToggleExtraFilter('hasInterview')}>มีนัดสัมภาษณ์แล้ว</button>
            <button className="chip" aria-pressed={extraFilters.starred} onClick={() => handleToggleExtraFilter('starred')}>★ ปักดาวไว้</button>
          </div>

          <div className="result-count">พบ {filteredPrograms.length} รายการ</div>

          <div className="card-list">
            {filteredPrograms.map(p => {
              const u = computeUrgency(p)
              return (
                <article key={p.id} className="card">
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
                        <UniversityLogo university={p.university} size={32} />
                        <div>
                          <div className="card-uni">{p.university}</div>
                          <div className="card-sub">{[p.faculty, p.major].filter(Boolean).join(' · ')}</div>
                        </div>
                      </div>
                      <div className="card-actions">
                        <button className="star-btn" data-active={p.priority > 0} onClick={() => {
                          const nextPriority = p.priority > 0 ? 0 : 1
                          setPriority(p.id, nextPriority)
                          setPrograms(programs.map(pr => pr.id === p.id ? { ...pr, priority: nextPriority } : pr))
                          toast.success(nextPriority > 0 ? 'ปักหมุดแล้ว' : 'เลิกปักหมุด')
                        }}>★</button>
                        <button className="btn btn-ghost btn-icon" onClick={() => handleOpenForm(p)}>✎</button>
                        <button className="btn btn-danger-ghost btn-icon" onClick={() => handleDelete(p.id)}>🗑</button>
                      </div>
                    </div>
                    <div className="badge-row">
                      {p.priority > 0 && <span className="badge" data-tone="warn">★ อันดับที่ชอบ {p.priority}</span>}
                      {p.round && <span className="badge">{p.round}</span>}
                      <span className="badge" data-tone={STATUS_META[p.status]?.color || 'neutral'}>{p.status}</span>
                      {p.tcasFolio && <span className="badge" data-tone="accent">ใช้ TCASFolio</span>}
                      
                      {p.applicationFee != null && p.applicationFee > 0 && (
                        p.feePaid ? (
                          <span className="badge" data-tone="success">✅ จ่ายค่าสมัครแล้ว</span>
                        ) : (
                          <>
                            <span className="badge" data-tone="danger">❌ ยังไม่จ่ายค่าสมัคร ({p.applicationFee} ฿)</span>
                            <button className="status-quick-btn" data-tone="success" onClick={() => handleToggleFeePaid(p.id, true)}>จ่ายแล้ว</button>
                          </>
                        )
                      )}

                      {NEXT_STATUS[p.status]?.map(ns => (
                        <button key={ns} className="status-quick-btn" data-tone={STATUS_META[ns]?.color || 'neutral'} onClick={() => handleQuickStatus(p.id, ns)}>
                          {ns}
                        </button>
                      ))}
                    </div>
                    <div className="date-row">
                      <div className="date-item"><b>เปิดรับ</b><span>{formatDate(p.openDate)}</span></div>
                      <div className="date-item"><b>ปิดรับ</b><span>{formatDate(p.closeDate)}</span></div>
                      <div className="date-item"><b>ประกาศผล</b><span>{formatDate(p.resultDate)}</span></div>
                    </div>
                    
                    <details className="more" style={{ marginTop: 12 }}>
                      <summary><svg className="chev" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 6 6 6-6 6"/></svg> รายละเอียดเพิ่มเติม</summary>
                      
                      <div className="detail-section" style={{ marginTop: 8 }}>
                        <h4 style={{ fontSize: 12, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>เกณฑ์การคัดเลือก</h4>
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
                              <label key={doc.id} className="doc-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13.5 }}>
                                <input type="checkbox" checked={doc.done} onChange={(e) => {
                                  toggleDocument(doc.id, e.target.checked)
                                  setPrograms(programs.map(pr => pr.id === p.id ? { ...pr, documents: pr.documents.map((d: any) => d.id === doc.id ? { ...d, done: e.target.checked } : d) } : pr))
                                  if (e.target.checked) toast.success('เตรียมเอกสารนี้แล้ว')
                                }} style={{ marginTop: 2, accentColor: 'var(--text)' }} />
                                <span style={{ textDecoration: doc.done ? 'line-through' : 'none', color: doc.done ? 'var(--text-faint)' : 'inherit' }}>{doc.text}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {(p.note || p.link) && (
                        <div className="detail-section" style={{marginTop: 12}}>
                          {p.link && <div style={{marginBottom:4}}><a href={p.link} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex', padding:'4px 10px', fontSize:12, borderRadius:4, textDecoration:'none', backgroundColor:'var(--text)', color:'#fff', fontWeight: 500}}>🔗 ดูประกาศฉบับเต็ม</a></div>}
                          {p.note && <div style={{marginTop: 8, fontSize: 13.5, color: 'var(--text-muted)'}}><b>บันทึก:</b> {p.note}</div>}
                        </div>
                      )}
                    </details>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}

      {/* Basic implementations for compare & timeline can go here */}
      {view === 'compare' && <CompareView programs={programs} />}
      {view === 'timeline' && <TimelineView programs={filteredPrograms} />}

      {formOpen && (
        <ProgramFormModal
          suggestions={suggestions}
          editingProgram={editingProgram}
          onClose={() => setFormOpen(false)}
          onSave={async (data) => {
            const loading = toast.loading('กำลังบันทึกข้อมูล...')
            if (editingProgram) {
              await updateProgram(editingProgram.id, data)
              setPrograms(programs.map(p => p.id === editingProgram.id ? { ...p, ...data } : p))
              toast.success('แก้ไขข้อมูลเรียบร้อย', { id: loading })
            } else {
              await createProgram({ ...data, documents: [] })
              toast.success('เพิ่มรายการใหม่เรียบร้อย', { id: loading })
              window.location.reload()
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
    if (typeof window === 'undefined') return true
    return localStorage.getItem('tl_showPast') !== '0'
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
    addEvent(p.closeDate,         'ปิดรับสมัคร')
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
                          {p.interviewFormat && <span>📍 {p.interviewFormat === 'onsite' ? 'Onsite' : 'Online'}</span>}
                          {p.interviewPlace  && <span>🏛 {p.interviewPlace}</span>}
                        </div>
                      )}

                      {ev.label === 'ปิดรับสมัคร' && p.tcasFolio && (
                        <div style={{ marginTop: 6, fontSize: 11.5, color: '#6366f1', fontWeight: 500 }}>📎 ต้องใช้ TCASFolio</div>
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
            ⚠ รายการที่ยังไม่ระบุกำหนดการ ({undated.length} รายการ)
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

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 4 ? [...prev, id] : prev
    )
  }

  const picked = programs.filter(p => selected.includes(p.id))

  const ROW_DEFS: { label: string; render: (p: any) => React.ReactNode }[] = [
    { label: 'มหาวิทยาลัย', render: p => <b>{p.university}</b> },
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
        && (new Date(p.closeDate).getTime() - Date.now()) / 86400000 <= 7
      return <span style={{ color: urgent ? '#ef4444' : 'inherit', fontWeight: urgent ? 700 : 400 }}>{d}</span>
    }},
    { label: 'ประกาศผล', render: p => formatDate(p.resultDate) },
    { label: 'ค่าสมัคร', render: p => p.applicationFee != null
      ? <span>{p.applicationFee.toLocaleString('th-TH')} บาท <span style={{ fontSize: 11, color: p.feePaid ? 'var(--success)' : 'var(--text-faint)' }}>({p.feePaid ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'})</span></span>
      : '—'
    },
    { label: 'TCASFolio', render: p => p.tcasFolio ? '✅ ใช้ TCASFolio' : '—' },
    { label: 'เกณฑ์คัดเลือก', render: p => <CriteriaBars criteria={p.criteria || ''} /> },
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
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 8 }}>
          เลือกรายการที่ต้องการเปรียบเทียบ (สูงสุด 4 รายการ) · เลือกแล้ว {selected.length}/4
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {programs.map(p => {
            const isOn = selected.includes(p.id)
            const disabled = !isOn && selected.length >= 4
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                disabled={disabled}
                style={{
                  padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${isOn ? 'var(--text)' : 'var(--border)'}`,
                  background: isOn ? 'var(--text)' : 'var(--surface)',
                  color: isOn ? 'var(--surface)' : 'var(--text)',
                  fontSize: 12.5, fontWeight: isOn ? 600 : 400,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                  animation: 'fadeSlideUp 0.25s ease both',
                }}
              >
                {p.university} · {p.major || p.faculty}
              </button>
            )
          })}
        </div>
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
                  <th key={p.id} style={{ padding: '10px 12px', textAlign: 'left', background: 'var(--surface-2)', borderBottom: '2px solid var(--border)', animation: `slideInRight 0.3s ease ${i*0.07}s both` }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.university}</div>
                    <div style={{ fontWeight: 400, fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{p.major || p.faculty}</div>
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
