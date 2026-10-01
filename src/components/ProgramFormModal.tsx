'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import CreatableSelect from 'react-select/creatable'
import toast from 'react-hot-toast'
import { ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { STATUS_ORDER } from '@/lib/constants'
import { checkStatusDisabled, resolveAutoStatus } from '@/lib/utils'
import { getSuggestions } from '@/app/actions'
import ThaiDatePicker from './ThaiDatePicker'

interface ProgramFormModalProps {
  editingProgram: any | null
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

const STEPS = ['หลักสูตร', 'กำหนดการ', 'เกณฑ์และเอกสาร']
const DOC_SUGGESTIONS = ['ปพ.1', 'Portfolio (PDF)', 'สำเนาบัตรประชาชน', 'รูปถ่ายหน้าตรง', 'หนังสือรับรองจากโรงเรียน', 'คลิปแนะนำตัว', 'เรียงความ', 'ผลสอบภาษาอังกฤษ', 'เกียรติบัตร']
const CRIT_SUGGESTIONS = ['Portfolio', 'GPAX', 'สัมภาษณ์', 'TGAT', 'TPAT3', 'A-Level']
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

const parseDateStr = (str: string | null | undefined) => {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const formatDateObj = (d: Date | null) => {
  if (!d) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const parseCriteriaToItems = (text: string) => {
  if (!text) return []
  return text.split(',').map(s => s.trim()).filter(Boolean).map(part => {
    const m = part.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*%$/)
    return m ? { id: uid(), label: m[1].trim(), pct: m[2] } : { id: uid(), label: part, pct: '' }
  })
}
const stringifyCriteriaItems = (items: any[]) => items
  .filter(it => it?.label?.trim())
  .map(it => { const p = String(it.pct ?? '').trim(); return p ? `${it.label.trim()} ${p}%` : it.label.trim() })
  .join(', ')

// ย่อรูปโลโก้ให้ไม่เกิน 256px ก่อนเก็บ เพื่อไม่ให้ฐานข้อมูลบวม
function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => resolve(reader.result as string)
      img.onload = () => {
        const max = 256
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        if (scale === 1 && file.size < 120_000) return resolve(reader.result as string)
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/png'))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

const rsProps = {
  classNamePrefix: 'rs',
  isClearable: true,
  formatCreateLabel: (v: string) => `ใช้ "${v}"`,
  noOptionsMessage: () => 'พิมพ์เพื่อเพิ่มใหม่',
}

function initialState(p: any | null) {
  const base = {
    university: '', faculty: '', major: '', curriculum: '', round: '', status: 'รอประกาศเกณฑ์',
    openDate: null, closeDate: null, interviewEligibleDate: null, resultDate: null, interviewDate: null, confirmationDate: null,
    interviewFormat: '', interviewPlace: '', criteria: '', criteriaItems: [] as any[], link: '', admissionLink: '', logoUrl: '', note: '',
    tcasFolio: false, submissionSystem: '', customSystem: false,
    requirements: [{ label: 'GPAX ขั้นต่ำ', value: '' }, { label: 'GPA ขั้นต่ำ', value: '' }],
    applicationFee: '', feePaid: false, documents: [] as any[],
  }
  if (!p) return base
  return {
    ...base,
    university: p.university || '', faculty: p.faculty || '', major: p.major || '', curriculum: p.curriculum || '', round: p.round || '',
    status: p.status || 'รอประกาศเกณฑ์',
    openDate: parseDateStr(p.openDate), closeDate: parseDateStr(p.closeDate), interviewEligibleDate: parseDateStr(p.interviewEligibleDate),
    resultDate: parseDateStr(p.resultDate), interviewDate: parseDateStr(p.interviewDate), confirmationDate: parseDateStr(p.confirmationDate),
    interviewFormat: p.interviewFormat || '', interviewPlace: p.interviewPlace || '',
    criteria: p.criteria || '', criteriaItems: parseCriteriaToItems(p.criteria || ''),
    link: p.link || '', admissionLink: p.admissionLink || '', logoUrl: p.logoUrl || '', note: p.note || '',
    tcasFolio: !!p.tcasFolio, submissionSystem: p.submissionSystem || '', customSystem: !!p.submissionSystem,
    requirements: p.requirements ? (typeof p.requirements === 'string' ? JSON.parse(p.requirements) : p.requirements) : base.requirements,
    applicationFee: p.applicationFee?.toString() || '', feePaid: !!p.feePaid,
    documents: p.documents ? p.documents.map((d: any) => ({ ...d })) : [],
  }
}

export default function ProgramFormModal({ editingProgram, onClose, onSave }: ProgramFormModalProps) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState({ universities: [] as string[], faculties: [] as string[], majors: [] as string[], curriculums: [] as string[] })
  const [formData, setFormData] = useState<any>(() => initialState(editingProgram))
  const [initialJson] = useState(() => JSON.stringify(initialState(editingProgram)))
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => { getSuggestions().then(setSuggestions).catch(() => {}) }, [])
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }) }, [step])

  // ล็อกการเลื่อนหน้าหลักระหว่างเปิดฟอร์ม
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const dirty = JSON.stringify(formData) !== initialJson
  const step1Valid = !!formData.university && !!formData.faculty

  const tryClose = useCallback(() => {
    if (dirty && !window.confirm('ยังไม่ได้บันทึกการเปลี่ยนแปลง ต้องการปิดฟอร์มหรือไม่?')) return
    onClose()
  }, [dirty, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.react-datepicker-popper, .rs__menu')) tryClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [tryClose])

  const update = (fields: any) => setFormData((prev: any) => ({ ...prev, ...fields }))

  // เปลี่ยนวันที่ → คำนวณสถานะอัตโนมัติใหม่ (เหมือนระบบเดิม)
  const setDate = (field: string, d: Date | null) => {
    setFormData((prev: any) => {
      const next = { ...prev, [field]: d }
      if (['openDate', 'closeDate', 'interviewDate', 'resultDate'].includes(field)) {
        next.status = resolveAutoStatus({
          status: prev.status,
          openDate: formatDateObj(next.openDate), closeDate: formatDateObj(next.closeDate),
          interviewDate: formatDateObj(next.interviewDate), resultDate: formatDateObj(next.resultDate),
        })
      }
      return next
    })
  }

  const updateList = (key: string, i: number, patch: any) => {
    const list = [...formData[key]]; list[i] = { ...list[i], ...patch }; update({ [key]: list })
  }
  const removeFrom = (key: string, i: number) => update({ [key]: formData[key].filter((_: any, idx: number) => idx !== i) })

  const critSum = formData.criteriaItems.reduce((s: number, it: any) => s + (parseFloat(it.pct) || 0), 0)

  const goStep = (s: number) => {
    if (s > 1 && !step1Valid) { toast.error('กรอกมหาวิทยาลัยและคณะก่อน'); setStep(1); return }
    setStep(s)
  }

  const handleSubmit = async () => {
    if (!step1Valid) { toast.error('กรอกมหาวิทยาลัยและคณะก่อน'); setStep(1); return }
    const { criteriaItems, requirements, ...rest } = formData
    const openDateStr = formatDateObj(formData.openDate)
    const closeDateStr = formatDateObj(formData.closeDate)
    const interviewDateStr = formatDateObj(formData.interviewDate)
    const resultDateStr = formatDateObj(formData.resultDate)
    const finalData = {
      ...rest,
      status: resolveAutoStatus({ status: formData.status, openDate: openDateStr, closeDate: closeDateStr, interviewDate: interviewDateStr, resultDate: resultDateStr }),
      openDate: openDateStr,
      closeDate: closeDateStr,
      interviewEligibleDate: formatDateObj(formData.interviewEligibleDate),
      resultDate: resultDateStr,
      interviewDate: interviewDateStr,
      confirmationDate: formatDateObj(formData.confirmationDate),
      requirements: requirements.filter((r: any) => (r.label || '').trim() !== '' || (r.value || '').trim() !== ''),
      criteria: stringifyCriteriaItems(criteriaItems),
      applicationFee: formData.applicationFee ? Math.round(parseFloat(formData.applicationFee)) : null,
      documents: formData.documents.filter((d: any) => (d.text || '').trim() !== '').map((d: any) => ({ text: d.text, done: !!d.done })),
    }
    setSaving(true)
    try { await onSave(finalData) } finally { setSaving(false) }
  }

  const statusOptions = useMemo(() => STATUS_ORDER.map(s => ({ s, disabled: s !== formData.status && checkStatusDisabled(s, formData.status, formData) })), [formData])
  const opt = (arr: string[]) => arr.map(v => ({ label: v, value: v }))
  const val = (v: string) => v ? { label: v, value: v } : null
  const isEdit = !!editingProgram

  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) tryClose() }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <div className="dialog-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="form-title">{isEdit ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</h2>
            {isEdit && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{formData.university}{formData.major ? ` / ${formData.major}` : ''}</div>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={tryClose} aria-label="ปิด"><X size={20} /></button>
        </div>

        <div className="steps" role="tablist">
          {STEPS.map((name, i) => {
            const s = i + 1
            return (
              <button key={s} type="button" role="tab" aria-selected={step === s} className="step-tab"
                data-state={s === step ? 'current' : s < step ? 'done' : 'todo'} onClick={() => goStep(s)}>
                <div className="bar" />{s}. {name}
              </button>
            )
          })}
        </div>

        <div className="dialog-body" ref={bodyRef}>
          {step === 1 && (
            <div>
              <div className="fsec">
                <div className="fgrid">
                  <div className="field field-full">
                    <label className="label" htmlFor="f-uni">มหาวิทยาลัย <span className="req">*</span></label>
                    <CreatableSelect inputId="f-uni" {...rsProps} placeholder="พิมพ์ชื่อ เช่น มหาวิทยาลัยขอนแก่น"
                      options={opt(suggestions.universities)} value={val(formData.university)}
                      onChange={(v: any) => update({ university: v ? v.value : '' })} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="f-fac">คณะ <span className="req">*</span></label>
                    <CreatableSelect inputId="f-fac" {...rsProps} placeholder="เช่น วิศวกรรมศาสตร์"
                      options={opt(suggestions.faculties)} value={val(formData.faculty)}
                      onChange={(v: any) => update({ faculty: v ? v.value : '' })} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="f-major">สาขา</label>
                    <CreatableSelect inputId="f-major" {...rsProps} placeholder="เช่น วิศวกรรมคอมพิวเตอร์"
                      options={opt(suggestions.majors)} value={val(formData.major)}
                      onChange={(v: any) => update({ major: v ? v.value : '' })} />
                  </div>
                  <div className="field field-full">
                    <label className="label" htmlFor="f-cur">หลักสูตร <span className="opt">ไม่บังคับ</span></label>
                    <CreatableSelect inputId="f-cur" {...rsProps} placeholder="เช่น ภาคปกติ, นานาชาติ"
                      options={opt(suggestions.curriculums)} value={val(formData.curriculum)}
                      onChange={(v: any) => update({ curriculum: v ? v.value : '' })} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="f-round">รอบ / โครงการ</label>
                    <input id="f-round" className="input" value={formData.round} onChange={e => update({ round: e.target.value })} placeholder="เช่น รอบ 1 Portfolio" />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="f-status">สถานะ</label>
                    <select id="f-status" className="input" value={formData.status} onChange={e => update({ status: e.target.value })}>
                      {statusOptions.map(({ s, disabled }) => <option key={s} value={s} disabled={disabled}>{s}{disabled ? ' (ยังไม่ถึงกำหนด)' : ''}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="fsec">
                <div className="fsec-title">ส่ง Portfolio ผ่าน</div>
                <div className="choice-group" role="radiogroup">
                  <label className="choice">
                    <input type="radio" name="portType" checked={!formData.tcasFolio && !formData.customSystem} onChange={() => update({ tcasFolio: false, customSystem: false, submissionSystem: '' })} />
                    <b>ส่งไฟล์ปกติ</b><span>อัปโหลด PDF ตอนสมัคร</span>
                  </label>
                  <label className="choice">
                    <input type="radio" name="portType" checked={formData.tcasFolio} onChange={() => update({ tcasFolio: true, customSystem: false, submissionSystem: '' })} />
                    <b>TCASFolio</b><span>ระบบส่วนกลางของ ทปอ.</span>
                  </label>
                  <label className="choice">
                    <input type="radio" name="portType" checked={formData.customSystem} onChange={() => update({ tcasFolio: false, customSystem: true, submissionSystem: '' })} />
                    <b>ระบบของมหาวิทยาลัย</b><span>ระบุชื่อหรือลิงก์</span>
                  </label>
                </div>
                {formData.customSystem && (
                  <input className="input" style={{ marginTop: 8 }} value={formData.submissionSystem} onChange={e => update({ submissionSystem: e.target.value })} placeholder="ชื่อระบบ หรือ URL" autoFocus />
                )}
              </div>

              <div className="fsec">
                <div className="fsec-title">โลโก้มหาวิทยาลัย <small>ใช้ร่วมกันทุกคณะของมหาวิทยาลัยเดียวกัน</small></div>
                <label className="logo-drop">
                  <div className="thumb">{formData.logoUrl ? <img src={formData.logoUrl} alt="" /> : <ImagePlus size={20} />}</div>
                  <div className="txt">{formData.logoUrl ? 'เปลี่ยนรูป' : 'เลือกรูปโลโก้'}<small>ถ้าไม่ใส่ ระบบจะหาโลโก้จากเว็บมหาวิทยาลัยให้</small></div>
                  {formData.logoUrl && <button type="button" className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }} onClick={e => { e.preventDefault(); update({ logoUrl: '' }) }}>ลบรูป</button>}
                  <input type="file" accept="image/*" className="sr-only" onChange={async e => {
                    const file = e.target.files?.[0]
                    if (file) update({ logoUrl: await shrinkImage(file) })
                    e.target.value = ''
                  }} />
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="fsec">
                <div className="fsec-title">ช่วงรับสมัคร</div>
                <div className="fgrid">
                  <div className="field"><label className="label" htmlFor="d-open"><Dot c="var(--ev-open)" /> เปิดรับสมัคร</label><ThaiDatePicker id="d-open" selected={formData.openDate} onChange={d => setDate('openDate', d)} /></div>
                  <div className="field"><label className="label" htmlFor="d-close"><Dot c="var(--ev-close)" /> ปิดรับสมัคร</label><ThaiDatePicker id="d-close" selected={formData.closeDate} onChange={d => setDate('closeDate', d)} /></div>
                </div>
              </div>
              <div className="fsec">
                <div className="fsec-title">หลังปิดรับสมัคร</div>
                <div className="fgrid">
                  <div className="field"><label className="label" htmlFor="d-elig"><Dot c="var(--ev-eligible)" /> ประกาศมีสิทธิ์สัมภาษณ์</label><ThaiDatePicker id="d-elig" selected={formData.interviewEligibleDate} onChange={d => setDate('interviewEligibleDate', d)} /></div>
                  <div className="field"><label className="label" htmlFor="d-int"><Dot c="var(--ev-interview)" /> วันสัมภาษณ์</label><ThaiDatePicker id="d-int" selected={formData.interviewDate} onChange={d => setDate('interviewDate', d)} /></div>
                  <div className="field"><label className="label" htmlFor="d-res"><Dot c="var(--ev-result)" /> ประกาศผล</label><ThaiDatePicker id="d-res" selected={formData.resultDate} onChange={d => setDate('resultDate', d)} /></div>
                  <div className="field"><label className="label" htmlFor="d-conf"><Dot c="var(--ev-confirm)" /> หมดเขตยืนยันสิทธิ์</label><ThaiDatePicker id="d-conf" selected={formData.confirmationDate} onChange={d => setDate('confirmationDate', d)} /></div>
                </div>
              </div>
              <div className="fsec">
                <div className="fsec-title">การสัมภาษณ์</div>
                <div className="fgrid">
                  <div className="field">
                    <label className="label" htmlFor="f-ifmt">รูปแบบ</label>
                    <select id="f-ifmt" className="input" value={formData.interviewFormat} onChange={e => update({ interviewFormat: e.target.value })}>
                      <option value="">ยังไม่ทราบ</option>
                      <option value="onsite">Onsite (ไปที่มหาวิทยาลัย)</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="f-iplace">สถานที่ / ลิงก์</label>
                    <input id="f-iplace" className="input" value={formData.interviewPlace} onChange={e => update({ interviewPlace: e.target.value })} placeholder="ตึก ห้อง หรือลิงก์ประชุม" />
                  </div>
                </div>
              </div>
              <p className="hint" style={{ marginTop: 16 }}>สถานะจะเปลี่ยนเองตามวันที่ เช่น ถึงวันเปิดรับแล้วจะกลายเป็น &quot;รอยื่นสมัคร&quot;</p>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="fsec">
                <div className="fsec-title">
                  สัดส่วนคะแนน
                  {formData.criteriaItems.length > 0 && <span className="sum-meter" data-ok={critSum === 100}>รวม {critSum}%</span>}
                </div>
                <div className="rows">
                  {formData.criteriaItems.map((it: any, i: number) => (
                    <div key={it.id || i} className="row-edit">
                      <input className="input" value={it.label} onChange={e => updateList('criteriaItems', i, { label: e.target.value })} placeholder="เช่น Portfolio" aria-label="ชื่อเกณฑ์" />
                      <div className="input-affix" style={{ width: 110, flexShrink: 0 }}>
                        <input className="input" type="number" inputMode="decimal" value={it.pct} onChange={e => updateList('criteriaItems', i, { pct: e.target.value })} placeholder="0" aria-label="ร้อยละ" style={{ height: 38 }} />
                        <span>%</span>
                      </div>
                      <button type="button" className="row-del" onClick={() => removeFrom('criteriaItems', i)} aria-label="ลบเกณฑ์"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
                <div className="suggest">
                  {CRIT_SUGGESTIONS.filter(s => !formData.criteriaItems.some((c: any) => c.label === s)).map(s => (
                    <button key={s} type="button" onClick={() => update({ criteriaItems: [...formData.criteriaItems, { id: uid(), label: s, pct: '' }] })}>+ {s}</button>
                  ))}
                  <button type="button" onClick={() => update({ criteriaItems: [...formData.criteriaItems, { id: uid(), label: '', pct: '' }] })}>+ อื่น ๆ</button>
                </div>
              </div>

              <div className="fsec">
                <div className="fsec-title">คุณสมบัติขั้นต่ำ</div>
                <div className="rows">
                  {formData.requirements.map((r: any, i: number) => (
                    <div key={i} className="row-edit">
                      <input className="input" value={r.label} onChange={e => updateList('requirements', i, { label: e.target.value })} placeholder="เช่น GPAX ขั้นต่ำ" aria-label="หัวข้อ" />
                      <input className="input" value={r.value} onChange={e => updateList('requirements', i, { value: e.target.value })} placeholder="เช่น 3.00" aria-label="ค่า" />
                      <button type="button" className="row-del" onClick={() => removeFrom('requirements', i)} aria-label="ลบ"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
                <button type="button" className="add-row" onClick={() => update({ requirements: [...formData.requirements, { label: '', value: '' }] })}><Plus size={14} /> เพิ่มคุณสมบัติ</button>
              </div>

              <div className="fsec">
                <div className="fsec-title">เอกสารที่ต้องเตรียม</div>
                <div className="rows">
                  {formData.documents.map((d: any, i: number) => (
                    <div key={d.id || i} className="row-edit">
                      <input className="input" value={d.text} onChange={e => updateList('documents', i, { text: e.target.value })} placeholder="ชื่อเอกสาร" aria-label="ชื่อเอกสาร" />
                      <button type="button" className="row-del" onClick={() => removeFrom('documents', i)} aria-label="ลบเอกสาร"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
                <div className="suggest">
                  {DOC_SUGGESTIONS.filter(s => !formData.documents.some((d: any) => d.text === s)).map(s => (
                    <button key={s} type="button" onClick={() => update({ documents: [...formData.documents, { id: uid(), text: s, done: false }] })}>+ {s}</button>
                  ))}
                  <button type="button" onClick={() => update({ documents: [...formData.documents, { id: uid(), text: '', done: false }] })}>+ อื่น ๆ</button>
                </div>
              </div>

              <div className="fsec">
                <div className="fsec-title">ค่าสมัคร</div>
                <div className="fgrid" style={{ alignItems: 'center' }}>
                  <div className="input-affix">
                    <input className="input" type="number" inputMode="decimal" min={0} value={formData.applicationFee} onChange={e => update({ applicationFee: e.target.value })} placeholder="เช่น 500" aria-label="ค่าสมัคร" />
                    <span>บาท</span>
                  </div>
                  <label className="toggle"><input type="checkbox" checked={formData.feePaid} onChange={e => update({ feePaid: e.target.checked })} /> จ่ายแล้ว</label>
                </div>
              </div>

              <div className="fsec">
                <div className="fsec-title">ลิงก์</div>
                <div className="fgrid">
                  <div className="field"><label className="label" htmlFor="f-link">ประกาศฉบับเต็ม</label><input id="f-link" className="input" value={formData.link} onChange={e => update({ link: e.target.value })} placeholder="https://" /></div>
                  <div className="field"><label className="label" htmlFor="f-adm">ระบบรับสมัคร <span className="opt">ถ้าว่าง ใช้ลิงก์มาตรฐาน</span></label><input id="f-adm" className="input" value={formData.admissionLink} onChange={e => update({ admissionLink: e.target.value })} placeholder="https://" /></div>
                </div>
              </div>

              <div className="fsec">
                <label className="fsec-title" htmlFor="f-note">บันทึกส่วนตัว</label>
                <textarea id="f-note" className="input" rows={4} value={formData.note} onChange={e => update({ note: e.target.value })} placeholder="คำถามสัมภาษณ์ที่คาดว่าจะเจอ สิ่งที่ต้องถามครูแนะแนว ฯลฯ" />
              </div>
            </div>
          )}
        </div>

        <div className="dialog-foot">
          <button type="button" className="btn btn-ghost" onClick={() => step > 1 ? setStep(step - 1) : tryClose()}>
            {step === 1 ? 'ยกเลิก' : 'ย้อนกลับ'}
          </button>
          <div style={{ flex: 1 }} />
          {step < 3 && (
            <button type="button" className={`btn ${isEdit ? '' : 'btn-primary'}`} onClick={() => goStep(step + 1)}>ถัดไป</button>
          )}
          {(isEdit || step === 3) && (
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'กำลังบันทึก…' : isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Dot({ c }: { c: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
}
