import React, { useRef } from 'react';
import { TEEvent } from '../types';
import { teSound } from '../utils/sound';
import { syncToAppleCalendar, parseICSFile } from '../services/appleCalendarService';
import { Apple, Download, Upload, Check, ExternalLink, Calendar as CalIcon } from 'lucide-react';

interface AppleSyncModalProps {
  events: TEEvent[];
  onImportEvents: (imported: TEEvent[]) => void;
  onClose: () => void;
}

export const TEAppleSyncModal: React.FC<AppleSyncModalProps> = ({
  events,
  onImportEvents,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportICS = () => {
    teSound.alarmTone('chime');
    syncToAppleCalendar(events, 'op-cal-field-calendar.ics');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseICSFile(text);
        if (parsed.length > 0) {
          teSound.alarmTone('radar');
          onImportEvents(parsed);
          alert(`Successfully imported ${parsed.length} event(s) from Apple Calendar!`);
          onClose();
        } else {
          alert('No events found in this .ics file.');
        }
      } catch (err: unknown) {
        alert(`Failed to parse Apple Calendar file: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#191b22] border-2 border-[#383d4c] rounded-xl overflow-hidden shadow-2xl flex flex-col font-mono-te text-white">
        
        {/* Chassis Header */}
        <div className="bg-[#121317] px-4 py-3 border-b border-[#2d313c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff4c00] animate-pulse" />
            <span className="font-silkscreen text-xs tracking-wider text-white">
              BRIDGE // APPLE CALENDAR SYNC
            </span>
          </div>
          <button
            onClick={() => {
              teSound.click(500, 0.02);
              onClose();
            }}
            className="w-7 h-7 rounded bg-[#252833] hover:bg-[#343746] text-gray-400 hover:text-white flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          
          {/* Explanation badge */}
          <div className="bg-[#111215] border border-[#2d303b] p-3.5 rounded-lg flex items-start gap-3">
            <div className="w-9 h-9 rounded bg-white text-black flex items-center justify-center shrink-0 font-bold shadow">
              <Apple size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="font-silkscreen text-xs text-white">
                NATIVE APPLE CALENDAR (MACOS / IOS) INTEGRATION
              </h4>
              <p className="text-[10px] text-[#8e94a4] leading-relaxed">
                Seamlessly transfer events, locations, schedules, and custom sound reminders between this Teenage Engineering OP-CAL machine and your Apple Calendar (iCal).
              </p>
            </div>
          </div>

          {/* Action 1: Export / Direct Sync to Apple Calendar */}
          <div className="bg-[#1e2029] border border-[#343846] rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-silkscreen text-xs text-[#00d2c4] flex items-center gap-1.5">
                <Download size={13} />
                <span>EXPORT TO APPLE CALENDAR (.ICS)</span>
              </div>
              <p className="text-[10px] text-[#9ba0b0] mt-1">
                Generates RFC 5545 iCalendar stream with {events.length} active events and reminders. Opening this file adds them immediately to Apple Calendar.
              </p>
            </div>

            <button
              onClick={handleExportICS}
              className="px-4 py-2 rounded bg-[#00d2c4] hover:bg-[#00baa9] text-black font-silkscreen text-[10px] font-bold tracking-wider shrink-0 transition-all shadow active:scale-95"
            >
              DOWNLOAD & OPEN
            </button>
          </div>

          {/* Action 2: Import from Apple Calendar */}
          <div className="bg-[#1e2029] border border-[#343846] rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-silkscreen text-xs text-[#ff4c00] flex items-center gap-1.5">
                <Upload size={13} />
                <span>IMPORT APPLE CALENDAR FILE</span>
              </div>
              <p className="text-[10px] text-[#9ba0b0] mt-1">
                Select an exported <code className="text-white">.ics</code> file from your Mac or iPhone to populate OP-CAL.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".ics,text/calendar"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded bg-[#ff4c00] hover:bg-[#e04300] text-white font-silkscreen text-[10px] font-bold tracking-wider shrink-0 transition-all shadow active:scale-95"
            >
              SELECT .ICS FILE
            </button>
          </div>

          {/* Mac / iPhone quick instruction */}
          <div className="bg-[#111215] border border-[#2b2e38] p-3 rounded text-[10px] text-[#787d8d] space-y-1">
            <span className="font-silkscreen text-[9px] text-[#8e94a4] block">
              QUICK PROTOCOL FOR MAC & IPHONE:
            </span>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Click <strong>DOWNLOAD & OPEN</strong> above.</li>
              <li>When prompted on Mac or iPhone, choose <strong>Add to Calendar</strong>.</li>
              <li>All triggers, acoustic reminders, and time allocations will link to your Apple devices.</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#131418] px-4 py-2.5 border-t border-[#292c36] flex justify-end">
          <button
            onClick={() => {
              teSound.click(600, 0.02);
              onClose();
            }}
            className="px-4 py-1.5 rounded bg-[#282b36] hover:bg-[#343846] text-[#b0b5c4] font-silkscreen text-[10px]"
          >
            CLOSE
          </button>
        </div>

      </div>
    </div>
  );
};
