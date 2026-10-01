'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import { CalendarDays, CalendarPlus, Columns3, Download, Eye, FileSpreadsheet, LayoutList, Link2, Moon, Plus, Search, Star, Sun, Waypoints, X, ChevronRight } from 'lucide-react'
import { STATUS_META, STATUS_ORDER } from '@/lib/constants'
import { computeUrgency, isFullDate, resolveAutoStatus } from '@/lib/utils'
import { buildInterviewAlerts, exportCSV, exportICS, STATUS_DOT, TERMINAL_STATUSES } from '@/lib/insights'
import { createProgram, updateProgram, deleteProgram, toggleDocument, setPriorities, updateStatus, setFeePaid } from '@/app/actions'
import ProgramCard from './ProgramCard'
import Overview from './Overview'
import Popover from './Popover'
import ConfirmDialog from './ConfirmDialog'

const ProgramFormModal = dynamic(() => import('./ProgramFormModal'), { ssr: false })
const CalendarView = dynamic(() => import('./CalendarView'), { ssr: false })
const TimelineView = dynamic(() => import('./TimelineView'), { ssr: false })
const CompareView = dynamic(() => import('./CompareView'), { ssr: false })

const VIEWS = [
  { id: 'list', label: 'รายการ', icon: LayoutList },
  { id: 'calendar', label: 'ปฏิทิน', icon: CalendarDays },
  { id: 'timeline', label: 'ไทม์ไลน์', icon: Waypoints },
  { id: 'compare', label: 'เปรียบเทียบ', icon: Columns3 },
] as const

const SORTS: Record<string, string> = {
  urgency: 'ใกล้กำหนดก่อน',
  priority: 'อันดับที่ชอบก่อน',
  name: 'ชื่อมหาวิทยาลัย ก–ฮ',
  status: 'ตามขั้นตอนสถานะ',
}

export default function TrackerApp({ initialPrograms, readOnly = false }: { initialPrograms: any[]; readOnly?: boolean }) {
  const [programs, setPrograms] = useState<any[]>(initialPrograms)
  const router = useRouter()
  const params = useSearchParams()
  const searchRef = useRef<HTMLInputElement>(null)

  /* ---------- auto status sync (เหมือนเดิม) ---------- */
  useEffect(() => {
    setPrograms(prev => {
      let changed = false
      const updated = prev.map(p => {
        const next = resolveAutoStatus(p)
        if (next !== p.status) {
          changed = true
          if (!readOnly) updateStatus(p.id, next).catch(console.error)
          return { ...p, status: next }
        }
        return p
      })
      return changed ? updated : prev
    })
  }, [readOnly])

  /* ---------- theme ---------- */
  const [dark, setDark] = useState(false)
  useEffect(() => { setDark(document.documentElement.getAttribute('data-theme') === 'dark') }, [])
  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    if (next) document.documentElement.setAttribute('data-theme', 'dark')
    else document.documentElement.removeAttribute('data-theme')
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }

  /* ---------- URL-backed state ---------- */
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(() => {
    const f = params.get('filter')
    return f ? new Set(f.split(',').filter(Boolean)) : new Set()
  })
  const [search, setSearch] = useState(() => params.get('q') || '')
  const [sort, setSort] = useState(() => params.get('sort') || 'urgency')
  const [extraFilters, setExtraFilters] = useState(() => ({
    tcasFolio: params.get('tcasFolio') === '1',
    hasInterview: params.get('hasInterview') === '1',
    starred: params.get('starred') === '1',
  }))
  const [view, setView] = useState(() => params.get('view') || 'list')

  useEffect(() => {
    const p = new URLSearchParams()
    const cur: Record<string, string | null> = {
      view: view !== 'list' ? view : null,
      q: search || null,
      sort: sort !== 'urgency' ? sort : null,
      filter: filterStatuses.size ? [...filterStatuses].join(',') : null,
      tcasFolio: extraFilters.tcasFolio ? '1' : null,
      hasInterview: extraFilters.hasInterview ? '1' : null,
      starred: extraFilters.starred ? '1' : null,
    }
    Object.entries(cur).forEach(([k, v]) => { if (v) p.set(k, v) })
    const qs = p.toString()
    const next = qs ? '?' + qs : window.location.pathname
    if (window.location.search !== (qs ? '?' + qs : '')) router.replace(next, { scroll: false })
  }, [view, search, sort, filterStatuses, extraFilters, router])

  /* ---------- UI state ---------- */
  const [formOpen, setFormOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [flashId, setFlashId] = useState<string | null>(null)

  const openForm = useCallback((p: any = null) => { setEditingProgram(p); setFormOpen(true) }, [])

  /* keyboard shortcuts: "/" ค้นหา, "n" เพิ่มรายการ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (formOpen || confirmDelete) return
      if (e.key === '/') { e.preventDefault(); setView('list'); setTimeout(() => searchRef.current?.focus(), 0) }
      if ((e.key === 'n' || e.key === 'N') && !readOnly) { e.preventDefault(); openForm() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [formOpen, confirmDelete, readOnly, openForm])

  /* ---------- derived ---------- */
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of programs) c[p.status] = (c[p.status] || 0) + 1
    return c
  }, [programs])

  const filtersActive = filterStatuses.size > 0 || extraFilters.tcasFolio || extraFilters.hasInterview || extraFilters.starred || !!search.trim()
  const clearFilters = () => {
    setFilterStatuses(new Set()); setSearch('')
    setExtraFilters({ tcasFolio: false, hasInterview: false, starred: false })
  }

  const filteredPrograms = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = programs.filter(p => {
      if (filterStatuses.size > 0 && !filterStatuses.has(p.status)) return false
      if (extraFilters.tcasFolio && !p.tcasFolio) return false
      if (extraFilters.hasInterview) {
        if (!isFullDate(p.interviewDate)) return false
        const feeIsPaid = !p.applicationFee || p.feePaid
        if (!feeIsPaid || (p.status !== 'ยื่นสมัครแล้ว' && p.status !== 'ติดสัมภาษณ์')) return false
      }
      if (extraFilters.starred && !(p.priority > 0)) return false
      if (!q) return true
      return [p.university, p.faculty, p.major, p.curriculum, p.round, p.criteria, p.note].join(' ').toLowerCase().includes(q)
    })
    const urgencySort = (a: any, b: any) => {
      const ua: any = computeUrgency(a), ub: any = computeUrgency(b)
      if (ua.sortRank !== ub.sortRank) return ua.sortRank - ub.sortRank
      const ka = ua.sortKey ?? ua.diffDays ?? 9999
      const kb = ub.sortKey ?? ub.diffDays ?? 9999
      return ka - kb
    }
    if (sort === 'name') list.sort((a, b) => a.university.localeCompare(b.university, 'th'))
    else if (sort === 'status') list.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
    else if (sort === 'priority') list.sort((a, b) => {
      const ra = a.priority > 0 ? a.priority : 99, rb = b.priority > 0 ? b.priority : 99
      return ra !== rb ? ra - rb : urgencySort(a, b)
    })
    else list.sort(urgencySort)
    return list
  }, [programs, filterStatuses, extraFilters, search, sort])

  const activePrograms = filteredPrograms.filter(p => !TERMINAL_STATUSES.includes(p.status))
  const completedPrograms = filteredPrograms.filter(p => TERMINAL_STATUSES.includes(p.status))
  const interviewAlerts = useMemo(() => buildInterviewAlerts(programs), [programs])

  /* ---------- jump to a card (จาก agenda / ปฏิทิน / ไทม์ไลน์) ---------- */
  const jumpTo = useCallback((id: string) => {
    const p = programs.find(x => x.id === id)
    if (!p) return
    setView('list')
    if (!filteredPrograms.some(x => x.id === id)) clearFilters()
    if (TERMINAL_STATUSES.includes(p.status)) setShowCompleted(true)
    setExpanded(prev => new Set(prev).add(id))
    setTimeout(() => {
      document.getElementById(`program-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setFlashId(id)
      setTimeout(() => setFlashId(null), 1700)
    }, 60)
  }, [programs, filteredPrograms])

  /* ---------- handlers ---------- */
  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }, [])

  const handleStatus = useCallback(async (id: string, status: string) => {
    let before: string | undefined
    setPrograms(prev => prev.map(p => { if (p.id === id) { before = p.status; return { ...p, status } } return p }))
    try {
      await updateStatus(id, status)
      toast.success(`เปลี่ยนสถานะเป็น "${status}"`)
    } catch {
      setPrograms(prev => prev.map(p => p.id === id ? { ...p, status: before } : p))
      toast.error('เปลี่ยนสถานะไม่สำเร็จ ลองใหม่อีกครั้ง')
    }
  }, [])

  const handleFeePaid = useCallback(async (id: string, paid: boolean) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, feePaid: paid } : p))
    try {
      await setFeePaid(id, paid)
      toast.success(paid ? 'บันทึกว่าจ่ายค่าสมัครแล้ว' : 'เปลี่ยนเป็นยังไม่จ่าย')
    } catch {
      setPrograms(prev => prev.map(p => p.id === id ? { ...p, feePaid: !paid } : p))
      toast.error('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง')
    }
  }, [])

  const handleToggleDoc = useCallback(async (programId: string, docId: string, done: boolean) => {
    const apply = (val: boolean) => setPrograms(prev => prev.map(p => p.id === programId
      ? { ...p, documents: p.documents.map((d: any) => d.id === docId ? { ...d, done: val } : d) } : p))
    apply(done)
    try { await toggleDocument(docId, done) } catch { apply(!done); toast.error('บันทึกเอกสารไม่สำเร็จ') }
  }, [])

  const handleStar = (id: string) => {
    const target = programs.find(p => p.id === id)
    if (!target) return
    const current = target.priority || 0
    const updates: { id: string; priority: number }[] = []
    let next: any[]
    if (current > 0) {
      next = programs.map(p => {
        const pp = p.priority || 0
        if (p.id === id) { updates.push({ id: p.id, priority: 0 }); return { ...p, priority: 0 } }
        if (pp > current) { updates.push({ id: p.id, priority: pp - 1 }); return { ...p, priority: pp - 1 } }
        return p
      })
      toast.success('เอาออกจากอันดับที่ชอบแล้ว')
    } else {
      const rank = Math.max(0, ...programs.map(p => p.priority || 0)) + 1
      updates.push({ id, priority: rank })
      next = programs.map(p => p.id === id ? { ...p, priority: rank } : p)
      toast.success(`ตั้งเป็นอันดับที่ชอบ ${rank}`)
    }
    setPrograms(next)
    setPriorities(updates).catch(() => toast.error('บันทึกอันดับไม่สำเร็จ'))
  }

  const doDelete = async (target: any) => {
    setConfirmDelete(null)
    const loading = toast.loading('กำลังลบ…')
    try {
      await deleteProgram(target.id)
      const deletedPriority = target.priority || 0
      const updates: { id: string; priority: number }[] = []
      setPrograms(prev => prev.filter(p => p.id !== target.id).map(p => {
        const pp = p.priority || 0
        if (deletedPriority > 0 && pp > deletedPriority) return { ...p, priority: pp - 1 }
        return p
      }))
      if (deletedPriority > 0) {
        programs.forEach(p => { if (p.id !== target.id && (p.priority || 0) > deletedPriority) updates.push({ id: p.id, priority: p.priority - 1 }) })
        if (updates.length) setPriorities(updates)
      }
      toast.success('ลบรายการแล้ว', { id: loading })
    } catch {
      toast.error('ลบไม่สำเร็จ ลองใหม่อีกครั้ง', { id: loading })
    }
  }

  const handleSave = async (data: any) => {
    const loading = toast.loading('กำลังบันทึก…')
    try {
      if (editingProgram) {
        const updated = await updateProgram(editingProgram.id, data)
        setPrograms(prev => prev.map(p => {
          if (p.id === editingProgram.id) return { ...p, ...updated }
          if (data.university && p.university === data.university && updated.logoUrl !== undefined) return { ...p, logoUrl: updated.logoUrl }
          return p
        }))
        toast.success('บันทึกการแก้ไขแล้ว', { id: loading })
      } else {
        const created = await createProgram(data)
        setPrograms(prev => [...prev, created].map(p =>
          created.university && p.university === created.university && created.logoUrl ? { ...p, logoUrl: created.logoUrl } : p))
        toast.success('เพิ่มรายการแล้ว', { id: loading })
        setTimeout(() => jumpTo(created.id), 100)
      }
      setFormOpen(false)
    } catch (e) {
      console.error(e)
      toast.error('บันทึกไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองใหม่', { id: loading })
    }
  }

  const copyGuestLink = async () => {
    const url = `${window.location.origin}/guest`
    try { await navigator.clipboard.writeText(url); toast.success('คัดลอกลิงก์แบบดูอย่างเดียวแล้ว') }
    catch { toast(url) }
  }

  const renderCard = (p: any) => (
    <ProgramCard
      key={p.id}
      p={p}
      readOnly={readOnly}
      alert={interviewAlerts.get(p.id)}
      expanded={expanded.has(p.id)}
      flash={flashId === p.id}
      onToggleExpand={toggleExpand}
      onStar={handleStar}
      onEdit={openForm}
      onDelete={setConfirmDelete}
      onStatus={handleStatus}
      onFeePaid={handleFeePaid}
      onToggleDoc={handleToggleDoc}
    />
  )

  const statusChips = STATUS_ORDER.filter(s => statusCounts[s] || filterStatuses.has(s))

  return (
    <div className="app">
      {/* ================= Top bar ================= */}
      <header className="topbar">
        <div className="container topbar-inner">
          <a className="brand" href={readOnly ? '/guest' : '/'}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/icon-70.png" alt="TCAS70" width={29} height={36} />
            <div>
              <div className="brand-name">TCAS Tracker</div>
              <div className="brand-sub">{readOnly ? 'โหมดดูอย่างเดียว' : 'ไม่พลาดทุกกำหนดการ Portfolio'}</div>
            </div>
          </a>
          <div className="topbar-spacer" />
          <nav className="seg" aria-label="มุมมอง">
            {VIEWS.map(v => (
              <button key={v.id} aria-pressed={view === v.id} onClick={() => setView(v.id)}><v.icon size={15} />{v.label}</button>
            ))}
          </nav>
          <div className="topbar-spacer" />
          <div className="topbar-actions">
            <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label={dark ? 'ใช้โหมดสว่าง' : 'ใช้โหมดมืด'} title={dark ? 'โหมดสว่าง' : 'โหมดมืด'}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Popover align="right" width={260} trigger={({ toggle, ref, open }) => (
              <button ref={ref} className="btn btn-ghost btn-icon" onClick={toggle} aria-label="ส่งออกและแชร์" aria-expanded={open} title="ส่งออกและแชร์"><Download size={18} /></button>
            )}>
              {close => (
                <>
                  <button className="menu-item" onClick={() => { close(); const n = exportICS(programs); toast.success(`ส่งออก ${n} กำหนดการ เปิดไฟล์เพื่อเพิ่มลงปฏิทิน`) }}>
                    <CalendarPlus size={16} /> เพิ่มลงปฏิทินในมือถือ (.ics)
                  </button>
                  <button className="menu-item" onClick={() => { close(); exportCSV(filteredPrograms) }}>
                    <FileSpreadsheet size={16} /> ส่งออกตาราง (.csv)
                  </button>
                  {!readOnly && <>
                    <div className="menu-sep" />
                    <button className="menu-item" onClick={() => { close(); copyGuestLink() }}>
                      <Link2 size={16} /> คัดลอกลิงก์ให้ผู้ปกครองดู
                    </button>
                  </>}
                </>
              )}
            </Popover>
            {!readOnly && (
              <button className="btn btn-primary btn-add" onClick={() => openForm()} title="เพิ่มรายการ (กด N)">
                <Plus size={16} strokeWidth={2.5} /> <span className="btn-label-desk">เพิ่มรายการ</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        {readOnly && (
          <div className="guest-banner"><Eye size={16} /> คุณกำลังดูแบบอ่านอย่างเดียว ข้อมูลอัปเดตตามที่เจ้าของบันทึกไว้</div>
        )}

        {view === 'list' && (
          <>
            {programs.length > 0 && <Overview programs={programs} onJump={jumpTo} />}

            {programs.length > 0 && (
              <div className="filters">
                <div className="filters-row">
                  <label className="search">
                    <Search size={17} />
                    <span className="sr-only">ค้นหา</span>
                    <input ref={searchRef} type="search" placeholder="ค้นหามหาวิทยาลัย คณะ สาขา รอบ หรือบันทึก" value={search}
                      onChange={e => setSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); (e.target as HTMLInputElement).blur() } }} />
                    {search ? <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSearch('')} aria-label="ล้างคำค้น"><X size={15} /></button> : <kbd className="btn-label-desk">/</kbd>}
                  </label>
                  <select className="select" value={sort} onChange={e => setSort(e.target.value)} aria-label="เรียงลำดับ">
                    {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="chips" role="toolbar" aria-label="กรองรายการ">
                  <button className="chip" aria-pressed={filterStatuses.size === 0} onClick={() => setFilterStatuses(new Set())}>
                    ทุกสถานะ <span className="count">{programs.length}</span>
                  </button>
                  {statusChips.map(s => (
                    <button key={s} className="chip" aria-pressed={filterStatuses.has(s)}
                      onClick={() => setFilterStatuses(prev => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n })}>
                      <span className="dot" style={{ background: STATUS_DOT[STATUS_META[s]?.color || 'neutral'] }} />
                      {s} <span className="count">{statusCounts[s] || 0}</span>
                    </button>
                  ))}
                  <span className="chip-sep" />
                  <button className="chip" aria-pressed={extraFilters.starred} onClick={() => setExtraFilters(f => ({ ...f, starred: !f.starred }))}><Star size={13} /> อันดับที่ชอบ</button>
                  <button className="chip" aria-pressed={extraFilters.tcasFolio} onClick={() => setExtraFilters(f => ({ ...f, tcasFolio: !f.tcasFolio }))}>ใช้ TCASFolio</button>
                  <button className="chip" aria-pressed={extraFilters.hasInterview} onClick={() => setExtraFilters(f => ({ ...f, hasInterview: !f.hasInterview }))}>มีนัดสัมภาษณ์</button>
                </div>
              </div>
            )}

            {programs.length > 0 && (
              <div className="result-line">
                <span>
                  {filtersActive ? `ตรงเงื่อนไข ${filteredPrograms.length} จาก ${programs.length} รายการ` : `กำลังดำเนินการ ${activePrograms.length} รายการ`}
                  {completedPrograms.length > 0 && filtersActive ? ` (จบแล้ว ${completedPrograms.length})` : ''}
                </span>
                {filtersActive && <button className="linkish" onClick={clearFilters}>ล้างตัวกรอง</button>}
              </div>
            )}

            {programs.length === 0 ? (
              <div className="empty" style={{ marginTop: 28 }}>
                <CalendarPlus size={34} strokeWidth={1.6} />
                <h3>เริ่มจากรายการแรก</h3>
                <p>{readOnly ? 'ยังไม่มีรายการที่บันทึกไว้' : 'เพิ่มคณะที่อยากยื่น แล้วระบบจะนับถอยหลังและเตือนกำหนดการให้'}</p>
                {!readOnly && <button className="btn btn-primary" onClick={() => openForm()}><Plus size={16} /> เพิ่มรายการ</button>}
              </div>
            ) : filteredPrograms.length === 0 ? (
              <div className="empty">
                <Search size={30} strokeWidth={1.6} />
                <h3>ไม่พบรายการที่ตรงเงื่อนไข</h3>
                <p>ลองเปลี่ยนคำค้น หรือเอาตัวกรองบางอันออก</p>
                <button className="btn" onClick={clearFilters}>ล้างตัวกรองทั้งหมด</button>
              </div>
            ) : (
              <>
                <div className="card-list">
                  {activePrograms.map(renderCard)}
                  {activePrograms.length === 0 && (
                    <div className="empty" style={{ padding: 28 }}><p style={{ margin: 0 }}>ไม่มีรายการที่กำลังดำเนินการในตัวกรองนี้</p></div>
                  )}
                </div>
                {completedPrograms.length > 0 && (
                  <>
                    <button className="group-toggle" aria-expanded={showCompleted} onClick={() => setShowCompleted(v => !v)}>
                      <ChevronRight size={15} /> จบขั้นตอนแล้ว {completedPrograms.length} รายการ
                    </button>
                    {showCompleted && <div className="card-list">{completedPrograms.map(renderCard)}</div>}
                  </>
                )}
              </>
            )}
          </>
        )}

        {view === 'calendar' && <CalendarView programs={programs} onOpen={jumpTo} onEdit={readOnly ? undefined : openForm} />}
        {view === 'timeline' && <TimelineView programs={programs} onOpen={jumpTo} />}
        {view === 'compare' && <CompareView programs={programs} />}
      </main>

      {/* mobile nav + FAB */}
      <nav className="bottom-nav" aria-label="มุมมอง">
        {VIEWS.map(v => (
          <button key={v.id} aria-pressed={view === v.id} onClick={() => { setView(v.id); window.scrollTo({ top: 0 }) }}><v.icon size={20} />{v.label}</button>
        ))}
      </nav>
      {!readOnly && <button className="fab" onClick={() => openForm()} aria-label="เพิ่มรายการ"><Plus size={24} strokeWidth={2.5} /></button>}

      {formOpen && <ProgramFormModal editingProgram={editingProgram} onClose={() => setFormOpen(false)} onSave={handleSave} />}

      {confirmDelete && (
        <ConfirmDialog
          title="ลบรายการนี้?"
          body={<><b style={{ color: 'var(--text)' }}>{confirmDelete.university}</b>{confirmDelete.major ? ` / ${confirmDelete.major}` : ''} พร้อมรายการเอกสารทั้งหมดจะถูกลบถาวร</>}
          confirmLabel="ลบรายการ"
          onConfirm={() => doDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
