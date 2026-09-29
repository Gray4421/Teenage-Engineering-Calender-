import React from 'react';
import { TEEvent, CustomReminder } from '../types';
import { teSound } from '../utils/sound';
import { Bell, Calendar, MapPin, ExternalLink, Volume2, Clock } from 'lucide-react';

interface AgendaViewProps {
  events: TEEvent[];
  onSelectEvent: (event: TEEvent) => void;
  onCreateEvent: (date: Date) => void;
}

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

export const TEAgendaView: React.FC<AgendaViewProps> = ({
  events,
  onSelectEvent,
  onCreateEvent,
}) => {
  // Sort events chronologically
  const sorted = [...events].sort((a, b) => {
    const timeA = new Date(a.start.dateTime || a.start.date || 0).getTime();
    const timeB = new Date(b.start.dateTime || b.start.date || 0).getTime();
    return timeA - timeB;
  });

  return (
    <div 
      onContextMenu={(e) => {
        e.preventDefault();
        teSound.click(1200, 0.03);
        onCreateEvent(new Date());
      }}
      className="flex-1 overflow-y-auto bg-[#141518] p-3 sm:p-5 space-y-3"
    >
      <div className="flex items-center justify-between pb-2 border-b border-[#2b2d36]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00d2c4] animate-pulse" />
          <span className="text-xs font-silkscreen text-white tracking-widest">
            SYNTH TRACKER // AGENDA STREAM
          </span>
        </div>
        <span className="text-[10px] font-mono-te text-[#7d8291]">
          {sorted.length} ACTIVE SEQUENCES
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#2d303b] rounded-xl">
          <p className="text-xs font-mono-te text-[#7d8290]">
            No upcoming sequences found in your local calendar.
          </p>
          <button
            onClick={() => onCreateEvent(new Date())}
            className="mt-3 px-4 py-2 rounded bg-[#ff4c00] text-white text-[10px] font-silkscreen tracking-wider"
          >
            CREATE FIRST EVENT
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((ev, index) => {
            const dateObj = new Date(ev.start.dateTime || ev.start.date || '');
            const color = COLOR_MAP[ev.colorId || '6'] || '#ff4c00';
            const reminders = ev.reminders || [];

            return (
              <div
                key={ev.id}
                onClick={() => {
                  teSound.click(1050, 0.02);
                  onSelectEvent(ev);
                }}
                className="bg-[#191b21] hover:bg-[#20222a] border border-[#2b2e38] hover:border-[#424654] rounded-lg p-3 sm:p-4 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
              >
                {/* Left: Index + Date badge */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-silkscreen text-[#ff4c00] opacity-75">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  
                  <div className="bg-[#111215] border border-[#292c36] px-2.5 py-1.5 rounded text-center min-w-[70px]">
                    <div className="text-[9px] font-silkscreen text-[#7e8392]">
                      {dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                    </div>
                    <div className="text-base font-mono-te font-black text-white">
                      {dateObj.getDate()}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <h3 className="text-sm font-mono-te font-bold text-white group-hover:text-[#ff4c00] transition-colors">
                        {ev.summary}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono-te text-[#8a8f9f]">
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="text-[#00d2c4]" />
                        {ev.start.dateTime
                          ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                          : 'ALL DAY'}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-[#f8c822]" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Custom Reminders chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  {reminders.map((rem, rIdx) => (
                    <span
                      key={rem.id || rIdx}
                      className="px-2 py-1 rounded bg-[#101216] border border-[#ff4c00]/30 text-[9px] font-silkscreen text-[#ff4c00] flex items-center gap-1"
                    >
                      <Bell size={9} />
                      <span>
                        {rem.leadMinutes === 0 ? 'START' : `${rem.leadMinutes}M`}
                      </span>
                      <span className="text-[#00d2c4] text-[8px]">
                        [{rem.sound.toUpperCase()}]
                      </span>
                    </span>
                  ))}

                  {ev.htmlLink && (
                    <a
                      href={ev.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded bg-[#232630] hover:bg-[#2d313e] text-[#8e93a2] hover:text-white"
                      title="Open in Google Calendar Web"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
