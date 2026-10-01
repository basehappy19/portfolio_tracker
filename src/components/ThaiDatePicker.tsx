'use client'

import React, { forwardRef } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { th } from 'date-fns/locale/th'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('th', th)

interface ThaiDatePickerProps {
  selected: Date | null
  onChange: (date: Date | null) => void
  placeholderText?: string
  id?: string
}

const THAI_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

// แสดงวันที่แบบอ่านง่าย "14 ก.ย. 2569" แทน dd/MM/yyyy
const CustomInput = forwardRef<HTMLInputElement, any>(({ onClick, placeholder, id, selectedDate }, ref) => (
  <input
    ref={ref}
    id={id}
    className="input"
    onClick={onClick}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
    readOnly
    value={selectedDate ? `${selectedDate.getDate()} ${THAI_MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear() + 543}` : ''}
    placeholder={placeholder}
    autoComplete="off"
    style={{ cursor: 'pointer', paddingRight: 36 }}
  />
))
CustomInput.displayName = 'CustomInput'

export default function ThaiDatePicker({ selected, onChange, placeholderText = 'เลือกวัน', id }: ThaiDatePickerProps) {
  return (
    <div className="date-wrap">
      <DatePicker
        selected={selected}
        onChange={(d: Date | null) => onChange(d)}
        locale="th"
        placeholderText={placeholderText}
        wrapperClassName="w-full"
        popperPlacement="bottom-start"
        customInput={<CustomInput id={id} selectedDate={selected} />}
        renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
          <div className="dp-head">
            <button type="button" onClick={e => { e.preventDefault(); decreaseMonth() }} aria-label="เดือนก่อนหน้า"><ChevronLeft size={16} /></button>
            <b>{THAI_MONTHS_FULL[date.getMonth()]} {date.getFullYear() + 543}</b>
            <button type="button" onClick={e => { e.preventDefault(); increaseMonth() }} aria-label="เดือนถัดไป"><ChevronRight size={16} /></button>
          </div>
        )}
      />
      {selected && (
        <button type="button" className="date-clear" onClick={() => onChange(null)} aria-label="ล้างวันที่"><X size={14} /></button>
      )}
    </div>
  )
}
