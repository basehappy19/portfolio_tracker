'use client'

import { useState, useEffect } from 'react'
import { STATUS_ORDER } from '@/lib/constants'
import ThaiDatePicker from './ThaiDatePicker'
import toast from 'react-hot-toast'

import CreatableSelect from 'react-select/creatable'

interface ProgramFormModalProps {
  editingProgram: any | null
  suggestions: {
    universities: string[]
    faculties: string[]
    majors: string[]
    curriculums: string[]
  }
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }
const inp = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 14 }

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    background: 'var(--surface-2)',
    borderColor: state.isFocused ? 'var(--text)' : 'var(--border)',
    borderRadius: 8,
    boxShadow: state.isFocused ? '0 0 0 1px var(--text)' : 'none',
    fontSize: 14,
    minHeight: 38,
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: state.isFocused ? 'var(--text)' : 'var(--border-hover)'
    }
  }),
  menu: (base: any) => ({ 
    ...base, 
    fontSize: 14, 
    zIndex: 9999,
    borderRadius: 8,
    boxShadow: 'var(--shadow-lg)'
  }),
  option: (base: any, state: any) => ({
    ...base,
    background: state.isSelected 
      ? 'var(--text)' 
      : state.isFocused 
        ? 'var(--surface-3)' 
        : 'transparent',
    color: state.isSelected ? '#fff' : 'var(--text)',
    cursor: 'pointer',
    '&:active': {
      background: 'var(--text)',
      color: '#fff'
    }
  })
}

export default function ProgramFormModal({ editingProgram, suggestions, onClose, onSave }: ProgramFormModalProps) {

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<any>({
    university: '', faculty: '', major: '', curriculum: '', round: '', status: 'รอประกาศเกณฑ์',
    openDate: null, closeDate: null, resultDate: null, interviewDate: null, confirmationDate: null,
    interviewFormat: '', interviewPlace: '', criteria: '', criteriaItems: [], link: '', admissionLink: '', logoUrl: '', note: '', tcasFolio: false,
    applicationFee: '', feePaid: false, documents: []
  })

  const parseCriteriaToItems = (text: string) => {
    if (!text) return []
    const items = []
    const parts = text.split(',')
    for (const part of parts) {
      const p = part.trim()
      if (!p) continue
      const match = p.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*%$/)
      if (match) {
        items.push({ id: Date.now().toString() + Math.random().toString(), label: match[1].trim(), pct: match[2] })
      } else {
        items.push({ id: Date.now().toString() + Math.random().toString(), label: p, pct: '' })
      }
    }
    return items
  }

  const stringifyCriteriaItems = (items: any[]) => {
    return items
      .filter(it => it?.label?.trim() !== '')
      .map(it => {
        const p = it.pct?.trim() || ''
        return p ? `${it.label.trim()} ${p}%` : it.label.trim()
      })
      .join(', ')
  }

  const parseDateStr = (str: string | null | undefined) => {
    if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  useEffect(() => {
    if (editingProgram) {
      setFormData({
        university: editingProgram.university || '',
        faculty: editingProgram.faculty || '',
        major: editingProgram.major || '',
        curriculum: editingProgram.curriculum || '',
        round: editingProgram.round || '',
        status: editingProgram.status || 'รอประกาศเกณฑ์',
        openDate: parseDateStr(editingProgram.openDate),
        closeDate: parseDateStr(editingProgram.closeDate),
        resultDate: parseDateStr(editingProgram.resultDate),
        interviewDate: parseDateStr(editingProgram.interviewDate),
        confirmationDate: parseDateStr(editingProgram.confirmationDate),
        interviewFormat: editingProgram.interviewFormat || '',
        interviewPlace: editingProgram.interviewPlace || '',
        criteria: editingProgram.criteria || '',
        criteriaItems: parseCriteriaToItems(editingProgram.criteria || ''),
        link: editingProgram.link || '',
        admissionLink: editingProgram.admissionLink || '',
        logoUrl: editingProgram.logoUrl || '',
        note: editingProgram.note || '',
        tcasFolio: !!editingProgram.tcasFolio,
        applicationFee: editingProgram.applicationFee?.toString() || '',
        feePaid: !!editingProgram.feePaid,
        documents: editingProgram.documents ? [...editingProgram.documents] : []
      })
    }
  }, [editingProgram])

  const updateFields = (fields: any) => {
    setFormData((prev: any) => ({ ...prev, ...fields }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Convert dates to YYYY-MM-DD
    const formatDateObj = (d: Date | null) => {
      if (!d) return null
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    
    // criteriaItems เป็น UI-only state — ไม่ส่งไป server
    const { criteriaItems, ...formDataWithoutCriteriaItems } = formData

    const finalData = {
      ...formDataWithoutCriteriaItems,
      openDate: formatDateObj(formData.openDate),
      closeDate: formatDateObj(formData.closeDate),
      resultDate: formatDateObj(formData.resultDate),
      interviewDate: formatDateObj(formData.interviewDate),
      confirmationDate: formatDateObj(formData.confirmationDate),
      criteria: stringifyCriteriaItems(criteriaItems),
      applicationFee: formData.applicationFee ? Math.round(parseFloat(formData.applicationFee)) : null,
      documents: formData.documents.filter((d: any) => d.text.trim() !== '').map((d: any) => ({ text: d.text, done: d.done }))
    }

    await onSave(finalData)
  }

  return (
    <div className="modal-overlay" style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000, padding: 16}}>
      <div className="modal" style={{backgroundColor:'#fff', borderRadius:16, width:'100%', maxWidth:560, maxHeight:'92vh', display:'flex', flexDirection:'column', position:'relative', animation: 'modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'}}>
        <button onClick={onClose} style={{position:'absolute', top:16, right:16, background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--text-faint)'}}>✕</button>
        
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{marginTop:0, marginBottom:16, fontSize:18, fontWeight:600}}>{editingProgram ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</h2>
          
          {/* Step Indicators */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: s <= step ? 'var(--text)' : 'var(--surface-3)',
                transition: 'background 0.3s ease'
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontWeight: 600 }}>
            <span>1. ข้อมูลหลัก</span>
            <span>2. กำหนดการ</span>
            <span>3. รายละเอียด</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          
          {/* STEP 1 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn 0.3s ease' }}>
              
              <div style={{ zIndex: 104 }}>
                <label style={lbl}>มหาวิทยาลัย *</label>
                <CreatableSelect
                  isClearable
                  placeholder="เช่น จุฬาลงกรณ์มหาวิทยาลัย"
                  options={suggestions.universities.map(u => ({ label: u, value: u }))}
                  value={formData.university ? { label: formData.university, value: formData.university } : null}
                  onChange={(val: any) => updateFields({ university: val ? val.value : '' })}
                  styles={selectStyles}
                  formatCreateLabel={(val) => `เพิ่ม "${val}"`}
                />
              </div>
              
              <div style={{ zIndex: 103 }}>
                <label style={lbl}>โลโก้มหาวิทยาลัย (ถ้ามี)</label>
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      updateFields({logoUrl: reader.result as string})
                    }
                    reader.readAsDataURL(file)
                  }
                }} style={{...inp, padding: '6px'}} />
                {formData.logoUrl && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={formData.logoUrl} alt="Logo Preview" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: '#fff', border: '1px solid var(--border)' }} />
                    <button type="button" onClick={() => updateFields({logoUrl: ''})} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', padding: 0 }}>ลบรูป</button>
                  </div>
                )}
              </div>
              
              <div style={{display:'flex', gap:10, zIndex: 103}}>
                <div style={{flex:1}}>
                  <label style={lbl}>คณะ *</label>
                  <CreatableSelect
                    isClearable
                    placeholder="ค้นหาหรือพิมพ์ชื่อคณะ"
                    options={suggestions.faculties.map(f => ({ label: f, value: f }))}
                    value={formData.faculty ? { label: formData.faculty, value: formData.faculty } : null}
                    onChange={(val: any) => updateFields({ faculty: val ? val.value : '' })}
                    styles={selectStyles}
                    formatCreateLabel={(val) => `เพิ่ม "${val}"`}
                  />
                </div>
                <div style={{flex:1}}>
                  <label style={lbl}>สาขา</label>
                  <CreatableSelect
                    isClearable
                    placeholder="ค้นหาหรือพิมพ์ชื่อสาขา"
                    options={suggestions.majors.map(m => ({ label: m, value: m }))}
                    value={formData.major ? { label: formData.major, value: formData.major } : null}
                    onChange={(val: any) => updateFields({ major: val ? val.value : '' })}
                    styles={selectStyles}
                    formatCreateLabel={(val) => `เพิ่ม "${val}"`}
                  />
                </div>
              </div>

              <div style={{ zIndex: 102 }}>
                <label style={lbl}>หลักสูตร</label>
                <CreatableSelect
                  isClearable
                  placeholder="เช่น นานาชาติ, ภาคพิเศษ"
                  options={suggestions.curriculums.map(c => ({ label: c, value: c }))}
                  value={formData.curriculum ? { label: formData.curriculum, value: formData.curriculum } : null}
                  onChange={(val: any) => updateFields({ curriculum: val ? val.value : '' })}
                  styles={selectStyles}
                  formatCreateLabel={(val) => `เพิ่ม "${val}"`}
                />
              </div>
              <div style={{display:'flex', gap:10}}>
                <div style={{flex:1}}><label style={lbl}>รอบที่สมัคร</label><input value={formData.round} onChange={e => updateFields({round: e.target.value})} style={inp} placeholder="เช่น 1 Portfolio" /></div>
                <div style={{flex:1}}><label style={lbl}>สถานะ</label>
                  <select value={formData.status} onChange={e => updateFields({status: e.target.value})} style={inp}>
                    {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <label style={{display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer', marginTop: 4, padding: '12px', background: 'var(--surface-2)', borderRadius: 8}}>
                <input type="checkbox" checked={formData.tcasFolio} onChange={e => updateFields({tcasFolio: e.target.checked})} style={{accentColor:'var(--text)', width:16, height:16}} />
                ใช้ TCASFolio (ต้องอัปโหลดผลงานผ่านระบบ TCAS)
              </label>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <div><label style={lbl}>เปิดรับสมัคร</label><ThaiDatePicker selected={formData.openDate} onChange={d => updateFields({openDate: d})} style={inp} placeholderText="เลือกวัน" /></div>
                <div><label style={lbl}>ปิดรับสมัคร</label><ThaiDatePicker selected={formData.closeDate} onChange={d => updateFields({closeDate: d})} style={inp} placeholderText="เลือกวัน" /></div>
                <div><label style={{...lbl, color:'#6366f1'}}>📋 ประกาศผล</label><ThaiDatePicker selected={formData.resultDate} onChange={d => updateFields({resultDate: d})} style={{...inp, borderColor:'#6366f133'}} placeholderText="เลือกวัน" /></div>
                <div><label style={{...lbl, color:'#f59e0b'}}>🗓 วันสัมภาษณ์</label><ThaiDatePicker selected={formData.interviewDate} onChange={d => updateFields({interviewDate: d})} style={{...inp, borderColor:'#f59e0b33'}} placeholderText="เลือกวัน" /></div>
                <div><label style={{...lbl, color:'#10b981'}}>✅ หมดเขตยืนยันสิทธิ์</label><ThaiDatePicker selected={formData.confirmationDate} onChange={d => updateFields({confirmationDate: d})} style={{...inp, borderColor:'#10b98133'}} placeholderText="เลือกวัน" /></div>
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <div><label style={lbl}>รูปแบบสัมภาษณ์</label>
                  <select value={formData.interviewFormat} onChange={e => updateFields({interviewFormat: e.target.value})} style={inp}>
                    <option value="">ยังไม่ระบุ</option>
                    <option value="onsite">Onsite (มาด้วยตนเอง)</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div><label style={lbl}>สถานที่ / ลิงก์</label><input value={formData.interviewPlace} onChange={e => updateFields({interviewPlace: e.target.value})} style={inp} placeholder="ตึก / ห้อง / MS Teams" /></div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn 0.3s ease' }}>
              <div>
                <label style={lbl}>เกณฑ์การคัดเลือก</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  {formData.criteriaItems.map((item: any, i: number) => (
                    <div key={item.id || i} style={{ display: 'flex', gap: 8 }}>
                      <input 
                        value={item.label} 
                        onChange={e => {
                          const newItems = [...formData.criteriaItems]
                          newItems[i] = { ...newItems[i], label: e.target.value }
                          updateFields({ criteriaItems: newItems })
                        }} 
                        style={{ ...inp, flex: 1, padding: '6px 10px' }} 
                        placeholder="เช่น Portfolio, GPAX, สัมภาษณ์" 
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '110px' }}>
                        <input 
                          type="number"
                          value={item.pct} 
                          onChange={e => {
                            const newItems = [...formData.criteriaItems]
                            newItems[i] = { ...newItems[i], pct: e.target.value }
                            updateFields({ criteriaItems: newItems })
                          }} 
                          style={{ ...inp, flex: 1, padding: '6px 10px', textAlign: 'center' }} 
                          placeholder="%" 
                        />
                        <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>%</span>
                      </div>
                      <button type="button" onClick={() => {
                        const newItems = formData.criteriaItems.filter((_: any, idx: number) => idx !== i)
                        updateFields({ criteriaItems: newItems })
                      }} style={{ padding: '0 12px', background: 'var(--surface-3)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--danger)', fontSize: 16 }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => {
                  updateFields({ criteriaItems: [...formData.criteriaItems, { id: Date.now().toString() + Math.random().toString(), label: '', pct: '' }] })
                }} style={{ padding: '8px 12px', fontSize: 13, background: 'var(--surface-3)', color: 'var(--text)', border: '1px dashed var(--border)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, width: '100%', textAlign: 'center' }}>
                  + เพิ่มเกณฑ์
                </button>
              </div>
              <div><label style={lbl}>ลิงก์ประกาศฉบับเต็ม (URL)</label><input type="url" value={formData.link} onChange={e => updateFields({link: e.target.value})} placeholder="https://..." style={inp} /></div>
              <div><label style={lbl}>ลิงก์ระบบ Admission มหาวิทยาลัย (ถ้ามี)</label><input type="url" value={formData.admissionLink} onChange={e => updateFields({admissionLink: e.target.value})} placeholder="https://..." style={inp} /></div>
              
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, alignItems:'end', marginTop: 4}}>
                <div><label style={lbl}>ค่าสมัคร (บาท)</label><input type="number" inputMode="decimal" min={0} value={formData.applicationFee} onChange={e => updateFields({applicationFee: e.target.value})} placeholder="เช่น 300" style={inp} /></div>
                <label style={{display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer', paddingBottom:9}}>
                  <input type="checkbox" checked={formData.feePaid} onChange={e => updateFields({feePaid: e.target.checked})} style={{accentColor:'var(--text)', width:15, height:15}} />
                  จ่ายค่าสมัครแล้ว
                </label>
              </div>

              <div>
                <label style={lbl}>เอกสารที่ต้องใช้</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  {formData.documents.map((doc: any, i: number) => (
                    <div key={doc.id || i} style={{ display: 'flex', gap: 8 }}>
                      <input 
                        value={doc.text} 
                        onChange={e => {
                          const newDocs = [...formData.documents]
                          newDocs[i] = { ...newDocs[i], text: e.target.value }
                          updateFields({ documents: newDocs })
                        }} 
                        style={{ ...inp, flex: 1, padding: '6px 10px' }} 
                        placeholder="เช่น Portfolio 10 หน้า" 
                      />
                      <button type="button" onClick={() => {
                        const newDocs = formData.documents.filter((_: any, idx: number) => idx !== i)
                        updateFields({ documents: newDocs })
                      }} style={{ padding: '0 12px', background: 'var(--surface-3)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--danger)', fontSize: 16 }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => {
                  updateFields({ documents: [...formData.documents, { id: Date.now().toString() + Math.random().toString(), text: '', done: false }] })
                }} style={{ padding: '8px 12px', fontSize: 13, background: 'var(--surface-3)', color: 'var(--text)', border: '1px dashed var(--border)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, width: '100%', textAlign: 'center' }}>
                  + เพิ่มเอกสาร
                </button>
              </div>

              <div><label style={lbl}>บันทึกส่วนตัว</label><textarea value={formData.note} onChange={e => updateFields({note: e.target.value})} rows={4} style={{...inp, resize:'vertical'}} placeholder="โน้ตเพิ่มเติมสิ่งที่ต้องเตรียม หรือสิ่งที่ต้องระวัง" /></div>
            </div>
          )}
        </form>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', background: 'var(--surface)' }}>
          <button type="button" onClick={() => step > 1 ? setStep(step - 1) : onClose()} style={{padding:'10px 20px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', fontWeight:600, cursor:'pointer', fontSize:14}}>
            {step === 1 ? 'ยกเลิก' : 'ย้อนกลับ'}
          </button>
          
          {step < 3 ? (
            <button type="button" onClick={() => {
              // Basic validation before next
              if (step === 1 && (!formData.university || !formData.faculty)) {
                toast.error('กรุณากรอกมหาวิทยาลัยและคณะ')
                return
              }
              setStep(step + 1)
            }} style={{padding:'10px 24px', borderRadius:8, border:'none', background:'var(--text)', color:'#fff', fontWeight:600, cursor:'pointer', fontSize:14}}>
              ถัดไป
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} style={{padding:'10px 24px', borderRadius:8, border:'none', background:'#10b981', color:'#fff', fontWeight:600, cursor:'pointer', fontSize:14}}>
              บันทึกข้อมูล
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
