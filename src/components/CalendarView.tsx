import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Building } from 'lucide-react';
import { THAI_MONTHS } from '@/lib/constants';
import { isFullDate } from '@/lib/utils';

interface CalendarViewProps {
  programs: any[];
}

export default function CalendarView({ programs }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
  }

  const events = useMemo(() => {
    const allEvents: any[] = [];
    programs.forEach(p => {
      const parseD = (iso: string) => {
        if (!isFullDate(iso)) return null;
        return new Date(iso + 'T00:00:00');
      };

      const openD = parseD(p.openDate);
      const closeD = parseD(p.closeDate);
      const intEligD = parseD(p.interviewEligibleDate);
      const intD = parseD(p.interviewDate);
      const resD = parseD(p.resultDate);
      const confD = parseD(p.confirmationDate);

      if (openD && closeD) {
        allEvents.push({ type: 'period', id: p.id + '-period', title: `เปิดรับสมัคร: ${p.university}`, start: openD, end: closeD, color: 'var(--accent)', p });
      } else if (openD) {
        allEvents.push({ type: 'point', id: p.id + '-open', title: `เปิดรับสมัคร: ${p.university}`, date: openD, color: 'var(--success)', p });
      } else if (closeD) {
        allEvents.push({ type: 'point', id: p.id + '-close', title: `ปิดรับสมัคร: ${p.university}`, date: closeD, color: 'var(--danger)', p });
      }

      if (intEligD) allEvents.push({ type: 'point', id: p.id + '-intElig', title: `ประกาศสิทธิ์: ${p.university}`, date: intEligD, color: 'var(--text)', p });
      if (intD) allEvents.push({ type: 'point', id: p.id + '-int', title: `สัมภาษณ์: ${p.university}`, date: intD, color: 'var(--warn)', p });
      if (resD) allEvents.push({ type: 'point', id: p.id + '-res', title: `ประกาศผล: ${p.university}`, date: resD, color: 'var(--success)', p });
      if (confD) allEvents.push({ type: 'point', id: p.id + '-conf', title: `ยืนยันสิทธิ์: ${p.university}`, date: confD, color: 'var(--danger)', p });
    });
    return allEvents;
  }, [programs]);

  const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '82vh' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setCurrentDate(new Date())} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            วันนี้
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={prevMonth} style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
            <button onClick={nextMonth} style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer' }}><ChevronRight size={20} /></button>
          </div>
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            {THAI_MONTHS[month]} {year + 543}
          </span>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map(d => (
          <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{d}</div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 'minmax(100px, 1fr)' }}>
        {days.map((dayObj, i) => {
          const dayTime = normalize(dayObj.date);
          const dayEvents = events.filter(e => {
            if (e.type === 'point') return normalize(e.date) === dayTime;
            if (e.type === 'period') return normalize(e.start) <= dayTime && normalize(e.end) >= dayTime;
            return false;
          });

          return (
            <div key={i} style={{ 
              borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
              borderBottom: i < 35 ? '1px solid var(--border)' : 'none',
              padding: '8px 4px',
              background: dayObj.isCurrentMonth ? 'transparent' : 'var(--surface-2)',
              opacity: dayObj.isCurrentMonth ? 1 : 0.5,
              display: 'flex', flexDirection: 'column', gap: 4
            }}>
              <div style={{ 
                textAlign: 'center', fontSize: 13, fontWeight: 500, 
                color: normalize(new Date()) === dayTime ? '#fff' : 'inherit',
                background: normalize(new Date()) === dayTime ? 'var(--accent)' : 'transparent',
                width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px'
              }}>
                {dayObj.day}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flex: 1 }}>
                {dayEvents.map(e => {
                  if (e.type === 'period') {
                    const isStart = normalize(e.start) === dayTime;
                    const isEnd = normalize(e.end) === dayTime;
                    const isSunday = dayObj.date.getDay() === 0;
                    const showTitle = isStart || isSunday;
                    
                    return (
                      <div key={e.id} style={{ 
                        background: e.color, color: '#fff', fontSize: 11, padding: '2px 6px', 
                        borderRadius: isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : '0',
                        marginLeft: isStart ? 4 : -4,
                        marginRight: isEnd ? 4 : -4,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        opacity: 0.85
                      }} title={e.title}>
                        {showTitle ? e.title : '\u00A0'}
                      </div>
                    );
                  } else {
                    return (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, padding: '2px 4px' }} title={e.title}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, marginTop: 4, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, lineHeight: 1.2, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                          {e.title}
                        </span>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
