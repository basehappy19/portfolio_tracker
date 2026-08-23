'use client'

import React, { forwardRef } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { th } from 'date-fns/locale/th'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('th', th)

interface ThaiDatePickerProps {
  selected: Date | null
  onChange: (date: Date | null) => void
  placeholderText?: string
  style?: React.CSSProperties
  className?: string
  id?: string
  name?: string
}

// Custom input to inject our styles from the parent
const CustomInput = forwardRef<HTMLInputElement, any>(({ value, onClick, onChange, style, className, placeholder, id, name }, ref) => {
  // Extract only the Thai date parts if a value is present (DD/MM/YYYY)
  let displayValue = value
  if (value) {
    const parts = value.split('/')
    if (parts.length === 3) {
      const year = parseInt(parts[2], 10)
      if (year < 2500) {
        displayValue = `${parts[0]}/${parts[1]}/${year + 543}`
      }
    }
  }

  return (
    <input
      ref={ref}
      id={id}
      name={name}
      className={className}
      style={style}
      onClick={onClick}
      onChange={onChange}
      value={displayValue}
      placeholder={placeholder}
      autoComplete="off"
    />
  )
})
CustomInput.displayName = 'CustomInput'

export default function ThaiDatePicker({ selected, onChange, placeholderText, style, className, id, name }: ThaiDatePickerProps) {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      locale="th"
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholderText}
      customInput={<CustomInput style={style} className={className} id={id} name={name} />}
      renderCustomHeader={({
        date,
        changeYear,
        changeMonth,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled,
      }) => {
        const thaiYear = date.getFullYear() + 543
        const monthName = th.localize?.month(date.getMonth() as any, { width: 'wide' })

        return (
          <div style={{ margin: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={(e) => { e.preventDefault(); decreaseMonth(); }}
              disabled={prevMonthButtonDisabled}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}
            >
              {'<'}
            </button>
            <div style={{ fontWeight: 'bold' }}>
              {monthName} {thaiYear}
            </div>
            <button
              onClick={(e) => { e.preventDefault(); increaseMonth(); }}
              disabled={nextMonthButtonDisabled}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}
            >
              {'>'}
            </button>
          </div>
        )
      }}
    />
  )
}
