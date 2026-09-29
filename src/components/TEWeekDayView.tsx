import React from 'react';
import { TEEvent } from '../types';
import { teSound } from '../utils/sound';
import { Bell, Clock, MapPin, Plus } from 'lucide-react';

interface WeekDayViewProps {
  currentDate: Date;
  events: TEEvent[];
  mode: 'WEEK' | 'DAY';
  onSelectEvent: (event: TEEvent) => void;
  onCreateEvent: (date: Date) => void;
}

const HOURS = Array.from({ length: 24 }).map((_, i) => i);

const COLOR_MAP: Record<string, string> = {
  '1': '#7986cb',
  '2': '#33b679',
  '3': '#8e24aa',
  '4': '#e67c73',
  '5': '#f6bf26',
  '6': '#ff4c00',
  '7': '#00d2c4',
  '8': '#616161',
  '9': '#3f51b5',
  '10': '#0b8043',
  '11': '#ff2a70',
};

export const TEWeekDayView: React.FC<WeekDayViewProps> = ({
  currentDate,
  events,
  mode,
  onSelectEvent,
  onCreateEvent,
}) => {
  // Compute days in week or single day
  const days: Date[] = [];
  if (mode === 'DAY') {
    days.push(new Date(currentDate));
  } else {
    // Current week starting Monday
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
  }

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  return (
    <div className="flex-1 flex flex-col bg-[#141518] text-[#d6d9e2] overflow-y-auto">
      
      {/* Top Header Row of Days */}
      <div
        className="grid border-b border-[#2b2d37] bg-[#18191f] sticky top-0 z-20"
        style={{
          gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="p-2 border-r border-[#2b2d37] text-[9px] font-silkscreen text-[#717684] flex items-center justify-center">
          HRS
        </div>
        {days.map((d, i) => {
          const isToday = isSameDay(d, new Date());
          return (
            <div
              key={i}
              className={`p-2.5 text-center border-r border-[#2b2d37] ${
                isToday ? 'bg-[#ff4c00]/10 text-white' : ''
              }`}
            >
              <div className="text-[10px] font-silkscreen tracking-wider text-[#8b909f]">
                {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </div>
              <div
                className={`text-sm font-mono-te font-bold inline-block px-1.5 rounded mt-0.5 ${
                  isToday ? 'bg-[#ff4c00] text-white' : 'text-[#e5e8f0]'
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid of Hours */}
      <div className="flex-1 relative">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid border-b border-[#21232c] min-h-[56px] relative"
            style={{
              gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            {/* Hour marker sidebar */}
            <div className="p-1 border-r border-[#21232c] text-[10px] font-mono-te text-[#646876] select-none text-right pr-2">
              {String(hour).padStart(2, '0')}:00
            </div>

            {/* Columns for each day */}
            {days.map((dayDate, dayIdx) => {
              // Find events that start at this hour or span it
              const matchingEvents = events.filter((ev) => {
                if (ev.start.dateTime) {
                  const evStart = new Date(ev.start.dateTime);
                  if (isSameDay(evStart, dayDate)) {
                    return evStart.getHours() === hour;
                  }
                }
                return false;
              });

              return (
                <div
                  key={dayIdx}
                  onClick={() => {
                    const clickDate = new Date(dayDate);
                    clickDate.setHours(hour, 0, 0, 0);
                    teSound.click(850, 0.015);
                    onCreateEvent(clickDate);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const clickDate = new Date(dayDate);
                    clickDate.setHours(hour, 0, 0, 0);
                    teSound.click(1200, 0.03);
                    onCreateEvent(clickDate);
                  }}
                  className="border-r border-[#21232c] p-1 relative hover:bg-[#1a1c22] transition-colors group cursor-pointer"
                >
                  {/* Subtle 30m separator */}
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#1a1c22] pointer-events-none" />

                  {/* Render events */}
                  {matchingEvents.map((ev) => {
                    const color = COLOR_MAP[ev.colorId || '6'] || '#ff4c00';
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          teSound.click(1100, 0.02);
                          onSelectEvent(ev);
                        }}
                        style={{ borderLeftColor: color }}
                        className="mb-1 p-1.5 rounded bg-[#101216] border-l-4 shadow border border-[#2b2d38] text-[10px] font-mono-te hover:bg-[#20232c] transition-all cursor-pointer select-none"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-white truncate">{ev.summary}</span>
                          {(ev.reminders || []).length > 0 && (
                            <Bell size={10} className="text-[#00d2c4] shrink-0" />
                          )}
                        </div>
                        {ev.location && (
                          <div className="flex items-center gap-1 text-[8px] text-[#8e93a2] truncate mt-0.5">
                            <MapPin size={9} /> {ev.location}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="opacity-0 group-hover:opacity-100 absolute right-1 top-1 text-[8px] font-silkscreen text-[#ff4c00] pointer-events-none">
                    +ADD
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
