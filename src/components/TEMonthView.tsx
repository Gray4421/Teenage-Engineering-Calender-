import React from 'react';
import { TEEvent } from '../types';
import { teSound } from '../utils/sound';
import { Bell, MapPin } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  events: TEEvent[];
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: TEEvent) => void;
  onCreateEvent: (date: Date) => void;
}

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const COLOR_MAP: Record<string, string> = {
  '1': '#7986cb',
  '2': '#33b679',
  '3': '#8e24aa',
  '4': '#e67c73',
  '5': '#f6bf26',
  '6': '#ff4c00', // TE Orange
  '7': '#00d2c4', // TE Cyan
  '8': '#616161',
  '9': '#3f51b5',
  '10': '#0b8043',
  '11': '#ff2a70',
};

export const TEMonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onSelectDate,
  onSelectEvent,
  onCreateEvent,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month (0 = Sun, 1 = Mon...)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Convert to Mon=0 ... Sun=6
  let startingDayOfWeek = firstDay.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const totalDays = lastDay.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Build grid cells
  const cells: Array<{
    date: Date;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }> = [];

  const today = new Date();
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    cells.push({
      date: d,
      dayNum: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
      isSelected: isSameDay(d, currentDate),
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, month, i);
    cells.push({
      date: d,
      dayNum: i,
      isCurrentMonth: true,
      isToday: isSameDay(d, today),
      isSelected: isSameDay(d, currentDate),
    });
  }

  // Next month leading days to complete grid (up to 35 or 42)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    cells.push({
      date: d,
      dayNum: i,
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
      isSelected: isSameDay(d, currentDate),
    });
  }

  // Get events for a specific cell
  const getEventsForDate = (date: Date) => {
    return events.filter((ev) => {
      if (ev.start.date) {
        // all day event (YYYY-MM-DD)
        const parts = ev.start.date.split('-');
        const evDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return isSameDay(evDate, date);
      }
      if (ev.start.dateTime) {
        const evDate = new Date(ev.start.dateTime);
        return isSameDay(evDate, date);
      }
      return false;
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#141518] text-[#e0e2e8] p-2 sm:p-4 select-none">
      
      {/* Weekday Headers in Silkscreen Font */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            className={`py-1.5 text-center text-[10px] font-silkscreen tracking-wider rounded ${
              idx >= 5 ? 'text-[#ff4c00] bg-[#1a1b20]' : 'text-[#858a98] bg-[#17181c]'
            } border border-[#23252d]`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid - Machined Button Layout */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 auto-rows-fr">
        {cells.map((cell, idx) => {
          const dayEvents = getEventsForDate(cell.date);
          const hasReminders = dayEvents.some((e) => (e.reminders || []).length > 0);

          return (
            <div
              key={idx}
              onClick={() => {
                teSound.click(cell.isCurrentMonth ? 950 : 600, 0.015);
                onSelectDate(cell.date);
              }}
              onDoubleClick={() => {
                teSound.click(1200, 0.03);
                onCreateEvent(cell.date);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                teSound.click(1200, 0.03);
                onSelectDate(cell.date);
                onCreateEvent(cell.date);
              }}
              className={`min-h-[75px] sm:min-h-[105px] rounded-lg p-1.5 sm:p-2 flex flex-col justify-between border transition-all cursor-pointer relative group ${
                cell.isSelected
                  ? 'border-[#ff4c00] bg-[#1c1e24] shadow-[0_0_12px_rgba(255,76,0,0.2)]'
                  : cell.isCurrentMonth
                  ? 'bg-[#181a1f] hover:bg-[#1f2128] border-[#292c36]'
                  : 'bg-[#121316] text-[#555a66] border-[#20222a] opacity-60'
              }`}
            >
              {/* Cell Header: Day number + LED Indicators */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs sm:text-sm font-mono-te font-bold px-1 rounded ${
                    cell.isToday
                      ? 'bg-[#ff4c00] text-white shadow-[0_0_8px_rgba(255,76,0,0.6)]'
                      : cell.isSelected
                      ? 'text-[#ff4c00]'
                      : 'text-[#d0d3de]'
                  }`}
                >
                  {cell.dayNum}
                </span>

                <div className="flex items-center gap-1">
                  {hasReminders && (
                    <Bell size={10} className="text-[#00d2c4] animate-pulse" />
                  )}
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] font-silkscreen text-[#858a98] bg-black/40 px-1 rounded">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Event Strips / Synthesizer Trackers */}
              <div className="space-y-1 my-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => {
                  const color = COLOR_MAP[ev.colorId || '6'] || '#ff4c00';
                  const time = ev.start.dateTime
                    ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                    : 'ALL-DAY';

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        teSound.click(1100, 0.02);
                        onSelectEvent(ev);
                      }}
                      style={{ borderLeftColor: color }}
                      className="text-[9px] sm:text-[10px] font-mono-te px-1.5 py-0.5 rounded bg-[#101215] hover:bg-[#252832] border-l-2 truncate transition-colors flex items-center justify-between gap-1 text-[#e1e4ec] group/item shadow-sm"
                    >
                      <span className="truncate font-semibold">{ev.summary}</span>
                      <span className="text-[8px] opacity-60 shrink-0 font-silkscreen">{time}</span>
                    </div>
                  );
                })}

                {dayEvents.length > 3 && (
                  <div className="text-[8px] font-silkscreen text-[#ff4c00] pl-1">
                    +{dayEvents.length - 3} MORE
                  </div>
                )}
              </div>

              {/* Sub-footer micro trigger */}
              <div className="flex items-center justify-between text-[7px] font-silkscreen text-[#505462] opacity-0 group-hover:opacity-100 transition-opacity">
                <span>+ TRIGGER [DBL]</span>
                <span className="text-[#00d2c4]">#CAL</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
