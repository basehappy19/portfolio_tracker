import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Settings2 } from 'lucide-react';
import { THAI_MONTHS } from '@/lib/constants';
import { isFullDate, formatDate } from '@/lib/utils';

interface CalendarViewProps {
  programs: any[];
  onEdit?: (p: any) => void;
}

const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
const hashColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function CalendarView({ programs, onEdit }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [popover, setPopover] = useState<{ event: any, x: number, y: number } | null>(null);
  const [showPeriods, setShowPeriods] = useState(false);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1; // Mon=0, Tue=1, ..., Sun=6
  };

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

      const univColor = hashColor(p.university || p.id);

      if (openD && closeD && showPeriods) {
        allEvents.push({ type: 'period', id: p.id + '-period', title: `รับสมัคร: ${p.university}`, start: openD, end: closeD, color: univColor, p });
      } else {
        if (openD) allEvents.push({ type: 'point', id: p.id + '-open', title: `เปิดรับสมัคร: ${p.university}`, date: openD, color: '#10b981', p });
        if (closeD) allEvents.push({ type: 'point', id: p.id + '-close', title: `ปิดรับสมัคร: ${p.university}`, date: closeD, color: '#ef4444', p });
      }

      if (intEligD) allEvents.push({ type: 'point', id: p.id + '-intElig', title: `ประกาศสิทธิ์: ${p.university}`, date: intEligD, color: '#3b82f6', p });
      if (intD) allEvents.push({ type: 'point', id: p.id + '-int', title: `สัมภาษณ์: ${p.university}`, date: intD, color: '#f59e0b', p });
      if (resD) allEvents.push({ type: 'point', id: p.id + '-res', title: `ประกาศผล: ${p.university}`, date: resD, color: '#10b981', p });
      if (confD) allEvents.push({ type: 'point', id: p.id + '-conf', title: `ยืนยันสิทธิ์: ${p.university}`, date: confD, color: '#ef4444', p });
    });
    return allEvents;
  }, [programs, showPeriods]);

  const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const handleEventClick = (e: React.MouseEvent, ev: any) => {
    e.stopPropagation();
    setPopover({ event: ev, x: e.clientX, y: e.clientY });
  };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '82vh', position: 'relative' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: 'var(--surface-2)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <input type="checkbox" checked={showPeriods} onChange={e => setShowPeriods(e.target.checked)} style={{ accentColor: 'var(--text)' }} />
            แสดงแถบยาว (ช่วงรับสมัคร)
          </label>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        {['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map(d => (
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
              <div 
                onClick={() => setSelectedDay(dayObj.date)}
                style={{ 
                  textAlign: 'center', fontSize: 13, fontWeight: 500, 
                  color: normalize(new Date()) === dayTime ? '#fff' : 'inherit',
                  background: normalize(new Date()) === dayTime ? 'var(--accent)' : 'transparent',
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px',
                  cursor: 'pointer'
                }}
                title="ดูเหตุการณ์ทั้งหมดในวันนี้"
              >
                {dayObj.day}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flex: 1 }}>
                {dayEvents.map(e => {
                  if (e.type === 'period') {
                    const isStart = normalize(e.start) === dayTime;
                    const isEnd = normalize(e.end) === dayTime;
                    const isMonday = dayObj.date.getDay() === 1;
                    const showTitle = isStart || isMonday;
                    
                    return (
                      <div key={e.id} 
                        onClick={(ev) => handleEventClick(ev, e)}
                        style={{ 
                        background: e.color + '15', color: 'var(--text)', fontSize: 11, padding: '2px 6px', fontWeight: 500,
                        borderTop: '1px solid ' + e.color + '40',
                        borderBottom: '1px solid ' + e.color + '40',
                        borderLeft: isStart || isMonday ? '4px solid ' + e.color : '1px solid transparent',
                        borderRight: isEnd ? '4px solid ' + e.color : '1px solid transparent',
                        borderRadius: isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : '0',
                        marginLeft: isStart ? 2 : -1,
                        marginRight: isEnd ? 2 : -1,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        cursor: 'pointer'
                      }} title="คลิกเพื่อดูรายละเอียด">
                        {showTitle ? e.title : '\u00A0'}
                      </div>
                    );
                  } else {
                    return (
                      <div key={e.id} 
                        onClick={(ev) => handleEventClick(ev, e)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 4, padding: '2px 4px', cursor: 'pointer' }} 
                        title="คลิกเพื่อดูรายละเอียด"
                      >
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

      {popover && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} onClick={() => setPopover(null)}>
          <div style={{ 
            position: 'absolute', 
            top: Math.min(popover.y + 10, window.innerHeight - 200), 
            left: Math.min(popover.x + 10, window.innerWidth - 300), 
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, width: 280, boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            zIndex: 101, animation: 'fadeIn 0.15s ease'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: popover.event.color }} />
              <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{popover.event.title}</h4>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{popover.event.p.university}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{popover.event.p.faculty} {popover.event.p.major}</div>
            {popover.event.type === 'period' && (
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 8 }}>
                รับสมัคร: {formatDate(popover.event.p.openDate)} - {formatDate(popover.event.p.closeDate)}
              </div>
            )}
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
            <button className="btn btn-primary" style={{ width: '100%', padding: '6px 0', fontSize: 13, background: 'var(--text)', color: 'var(--bg)' }} onClick={() => { setPopover(null); onEdit?.(popover.event.p); }}>ดูข้อมูลเต็ม / แก้ไข</button>
          </div>
        </div>
      )}

      {selectedDay && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20, width: '90%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>กำหนดการวันที่ {formatDate(selectedDay.toISOString().split('T')[0])}</h3>
              <button onClick={() => setSelectedDay(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
              {events.filter(e => {
                const dayTime = normalize(selectedDay);
                if (e.type === 'point') return normalize(e.date) === dayTime;
                if (e.type === 'period') return normalize(e.start) <= dayTime && normalize(e.end) >= dayTime;
                return false;
              }).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 14 }}>ไม่มีกำหนดการในวันนี้</div>
              ) : events.filter(e => {
                const dayTime = normalize(selectedDay);
                if (e.type === 'point') return normalize(e.date) === dayTime;
                if (e.type === 'period') return normalize(e.start) <= dayTime && normalize(e.end) >= dayTime;
                return false;
              }).map(e => (
                <div key={e.id + '-modal'} onClick={(ev) => { setSelectedDay(null); handleEventClick(ev, e); }} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 12, background: 'var(--surface-2)', borderRadius: 8, cursor: 'pointer', borderLeft: `4px solid ${e.color}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.p.faculty} {e.p.major}</div>
                  {e.type === 'period' && (
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                      ({formatDate(e.p.openDate)} - {formatDate(e.p.closeDate)})
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
