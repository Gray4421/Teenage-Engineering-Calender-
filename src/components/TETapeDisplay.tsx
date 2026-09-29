import React, { useState, useEffect } from 'react';
import { TETactileStepper } from './TETactileStepper';
import { teSound } from '../utils/sound';
import { ViewMode } from '../types';
import { Volume2, VolumeX, Sparkles, RefreshCw, Layers } from 'lucide-react';

interface TapeDisplayProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRefresh: () => void;
  isSyncing: boolean;
  eventsCount: number;
}

const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

export const TETapeDisplay: React.FC<TapeDisplayProps> = ({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  soundEnabled,
  onToggleSound,
  onRefresh,
  isSyncing,
  eventsCount,
}) => {
  const [tapeOffset, setTapeOffset] = useState(0);

  // Time ticker
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dial values
  const monthVal = currentDate.getMonth();
  const yearVal = currentDate.getFullYear();
  const dayVal = currentDate.getDate();

  const handleMonthKnob = (val: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(val);
    setTapeOffset((prev) => prev + 15);
    onDateChange(newDate);
  };

  const handleDayKnob = (val: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(val);
    setTapeOffset((prev) => prev + 5);
    onDateChange(newDate);
  };

  const handleYearKnob = (val: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(val);
    onDateChange(newDate);
  };

  const jumpToday = () => {
    teSound.click(1200, 0.04);
    onDateChange(new Date());
  };

  return (
    <div className="bg-[#18191d] border-b-2 border-[#2b2d35] p-3 md:p-4 text-white">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Main OP-1 Style LCD Screen */}
        <div className="w-full lg:w-auto flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          
          <div className="lcd-screen rounded-md p-3 sm:p-4 flex-1 flex flex-col justify-between min-h-[110px] select-none border border-[#788e72]">
            {/* Top LCD Status Bar */}
            <div className="flex items-center justify-between text-[11px] font-silkscreen font-bold tracking-wider opacity-90 border-b border-[#788e72]/50 pb-1 mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#1a2717] animate-pulse" />
                <span>CH-01: DUAL_CALENDAR_ENGINE</span>
              </div>
              <div className="flex items-center gap-3 font-mono-te text-[10px]">
                <span>TAPE: 3.75 IPS</span>
                <span className="bg-[#1a2717] text-[#9cb195] px-1 rounded">REC ●</span>
                <span>SYS CLK: {timeStr}</span>
              </div>
            </div>

            {/* LCD Center Display: Analog Graphic Tape Reel + Big Date Readout */}
            <div className="flex items-center justify-between gap-2 py-1">
              
              {/* Animated Mechanical Tape Reels */}
              <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-[#788e72]/40">
                <div className="relative w-10 h-10 rounded-full border-2 border-[#1a2717] flex items-center justify-center animate-[spin_10s_linear_infinite]">
                  <div className="w-4 h-4 rounded-full border border-[#1a2717]" />
                  <div className="absolute w-full h-[1px] bg-[#1a2717]" />
                  <div className="absolute h-full w-[1px] bg-[#1a2717]" />
                </div>

                <div className="flex flex-col text-[8px] font-mono-te leading-tight">
                  <span className="font-bold">INDEX</span>
                  <span className="font-silkscreen text-[11px]">
                    {String(yearVal).slice(-2)}:{String(monthVal + 1).padStart(2, '0')}:{String(dayVal).padStart(2, '0')}
                  </span>
                  <span className="text-[7px]">ITEMS: {eventsCount}</span>
                </div>

                <div className="relative w-10 h-10 rounded-full border-2 border-[#1a2717] flex items-center justify-center animate-[spin_7s_linear_infinite_reverse]">
                  <div className="w-4 h-4 rounded-full border border-[#1a2717]" />
                  <div className="absolute w-full h-[1px] bg-[#1a2717]" />
                  <div className="absolute h-full w-[1px] bg-[#1a2717]" />
                </div>
              </div>

              {/* Big Typography for Month, Day, and Year */}
              <div className="flex flex-col flex-1 pl-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-silkscreen tracking-tighter">
                    {MONTH_NAMES[monthVal]}
                  </span>
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono-te text-[#ff4c00]">
                    {String(dayVal).padStart(2, '0')}
                  </span>
                  <span className="text-xl sm:text-2xl font-mono-te opacity-75 font-semibold">
                    {yearVal}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono-te uppercase tracking-wider font-bold text-[#23351f]">
                  <span>{currentDate.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                  <span>—</span>
                  <span>VIEW: {viewMode}</span>
                  {isSyncing && <span className="animate-spin text-xs">⚙</span>}
                </div>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex flex-col gap-1 items-end">
                <button
                  onClick={jumpToday}
                  className="px-2.5 py-1 bg-[#1a2717] hover:bg-black text-[#9cb195] font-silkscreen text-[9px] rounded tracking-wider shadow active:translate-y-0.5 transition-all"
                >
                  TODAY [Z]
                </button>
                <div className="flex items-center gap-1 text-[8px] font-mono-te bg-[#8ba084] px-1.5 py-0.5 rounded text-[#1a2717] font-semibold">
                  <Sparkles size={10} />
                  <span>OP-CAL FIELD</span>
                </div>
              </div>

            </div>

            {/* Tape Ruler Line */}
            <div className="relative h-2 w-full bg-[#1a2717]/20 rounded-sm overflow-hidden mt-1">
              <div
                className="absolute top-0 bottom-0 flex gap-2 text-[6px] font-mono-te items-center transition-transform duration-200"
                style={{ transform: `translateX(${-tapeOffset % 40}px)` }}
              >
                {Array.from({ length: 30 }).map((_, i) => (
                  <span key={i} className="flex items-center gap-1 opacity-70">
                    <span className="h-2 w-[1px] bg-[#1a2717]" />
                    <span>{i}</span>
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Quick Action Matrix Pad Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 justify-center">
            {/* View Mode Buttons */}
            {(['MONTH', 'WEEK', 'DAY', 'AGENDA'] as ViewMode[]).map((mode) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => {
                    teSound.click(1000, 0.02);
                    onViewModeChange(mode);
                  }}
                  className={`px-3 py-1.5 rounded text-[10px] font-silkscreen tracking-wider flex items-center justify-between gap-2 border transition-all ${
                    active
                      ? 'bg-[#ff4c00] text-white border-[#ff4c00] shadow-[0_0_10px_rgba(255,76,0,0.4)]'
                      : 'bg-[#22242b] hover:bg-[#2c2f38] text-[#a0a5b2] border-[#343742]'
                  }`}
                >
                  <span>{mode}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      active ? 'bg-white shadow-[0_0_5px_white]' : 'bg-transparent border border-[#555]'
                    }`}
                  />
                </button>
              );
            })}
          </div>

        </div>

        {/* Tactical Keypad Stepper Controls Deck */}
        <div className="bg-[#121316] p-2.5 sm:p-3 rounded-lg border border-[#2b2d35] flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-3 shadow-inner w-full lg:w-auto">
          {/* Stepper 1: Month Selector */}
          <TETactileStepper
            label="MONTH"
            color="orange"
            value={monthVal}
            min={0}
            max={11}
            step={1}
            displayValue={MONTH_NAMES[monthVal]}
            onChange={handleMonthKnob}
          />

          {/* Stepper 2: Day Selector */}
          <TETactileStepper
            label="DAY"
            color="cyan"
            value={dayVal}
            min={1}
            max={31}
            step={1}
            displayValue={String(dayVal).padStart(2, '0')}
            onChange={handleDayKnob}
          />

          {/* Stepper 3: Year Selector */}
          <TETactileStepper
            label="YEAR"
            color="yellow"
            value={yearVal}
            min={2020}
            max={2035}
            step={1}
            displayValue={yearVal}
            onChange={handleYearKnob}
          />

          {/* Audio & Sync Control Box */}
          <div className="flex flex-col items-center select-none bg-[#101115] border border-[#262832] rounded-lg p-2 min-w-[80px]">
            <div className="flex items-center justify-between w-full mb-1 px-0.5">
              <span className="text-[9px] font-mono-te font-bold uppercase tracking-wider text-[#8a8f9e]">
                SYSTEM
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${soundEnabled ? 'bg-[#00d2c4] shadow-[0_0_6px_#00d2c4]' : 'bg-[#444]'}`} />
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                onClick={onToggleSound}
                className={`p-1.5 rounded text-[10px] font-silkscreen border transition-all flex items-center gap-1 ${
                  soundEnabled
                    ? 'bg-[#00d2c4]/20 border-[#00d2c4] text-[#00d2c4]'
                    : 'bg-[#20222a] border-[#333742] text-[#6b7280]'
                }`}
                title="Toggle Acoustic Feedback"
              >
                {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                <span className="text-[8px]">{soundEnabled ? 'SFX' : 'MUTE'}</span>
              </button>

              <button
                onClick={onRefresh}
                className={`p-1.5 rounded bg-[#20222a] hover:bg-[#ff4c00] hover:text-white border border-[#333742] text-[#9ca1af] transition-all ${
                  isSyncing ? 'animate-spin text-[#ff4c00]' : ''
                }`}
                title="Force Sync with Google Calendar"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
