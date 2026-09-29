import React from 'react';
import { teSound } from '../utils/sound';

interface SliderProps {
  label: string;
  subLabel?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  color?: 'orange' | 'cyan' | 'yellow' | 'magenta' | 'aluminum' | 'dark';
  onChange?: (val: number) => void;
  displayValue?: string | number;
  orientation?: 'vertical' | 'horizontal';
}

const colorStyles: Record<string, { trackActive: string; thumb: string; text: string; glow: string }> = {
  orange: {
    trackActive: 'bg-[#ff4c00]',
    thumb: 'bg-[#ff4c00] border-white',
    text: 'text-[#ff4c00]',
    glow: 'shadow-[0_0_10px_rgba(255,76,0,0.5)]',
  },
  cyan: {
    trackActive: 'bg-[#00d2c4]',
    thumb: 'bg-[#00d2c4] border-[#072421]',
    text: 'text-[#00d2c4]',
    glow: 'shadow-[0_0_10px_rgba(0,210,196,0.5)]',
  },
  yellow: {
    trackActive: 'bg-[#f8c822]',
    thumb: 'bg-[#f8c822] border-[#2e2609]',
    text: 'text-[#f8c822]',
    glow: 'shadow-[0_0_10px_rgba(248,200,34,0.5)]',
  },
  magenta: {
    trackActive: 'bg-[#ff2a70]',
    thumb: 'bg-[#ff2a70] border-white',
    text: 'text-[#ff2a70]',
    glow: 'shadow-[0_0_10px_rgba(255,42,112,0.5)]',
  },
  aluminum: {
    trackActive: 'bg-[#d8d6ce]',
    thumb: 'bg-[#e2e0d8] border-[#333]',
    text: 'text-[#d8d6ce]',
    glow: 'shadow-[0_0_8px_rgba(255,255,255,0.25)]',
  },
  dark: {
    trackActive: 'bg-[#3b3f4a]',
    thumb: 'bg-[#ff4c00] border-black',
    text: 'text-[#ff4c00]',
    glow: 'shadow-[0_0_8px_rgba(0,0,0,0.4)]',
  },
};

export const TESlider: React.FC<SliderProps> = ({
  label,
  subLabel,
  value,
  min = 0,
  max = 100,
  step = 1,
  color = 'orange',
  onChange,
  displayValue,
  orientation = 'vertical',
}) => {
  const theme = colorStyles[color] || colorStyles.orange;
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = Number(e.target.value);
    if (nextVal !== value && onChange) {
      teSound.dialTick(color === 'cyan' || color === 'orange');
      onChange(nextVal);
    }
  };

  if (orientation === 'horizontal') {
    return (
      <div className="flex flex-col gap-1 w-full select-none">
        <div className="flex items-center justify-between text-[10px] font-mono-te">
          <span className="font-bold text-[#9ca1af] uppercase tracking-wider">{label}</span>
          <span className={`font-silkscreen ${theme.text} bg-black/60 px-1.5 py-0.5 rounded border border-white/10 text-[9px]`}>
            {displayValue !== undefined ? displayValue : value}
          </span>
        </div>
        
        {/* Horizontal Machined Fader Track */}
        <div className="relative h-6 flex items-center">
          <div className="absolute inset-x-0 h-2 bg-[#121316] rounded-full border border-[#2d3039] overflow-hidden">
            <div
              className={`h-full ${theme.trackActive} opacity-80 transition-all`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          {/* Thumb marker */}
          <div
            className={`pointer-events-none absolute w-5 h-5 rounded-md ${theme.thumb} border-2 ${theme.glow} shadow-lg -ml-2.5 flex items-center justify-center transition-all`}
            style={{ left: `${percent}%` }}
          >
            <div className="w-[2px] h-2.5 bg-black/40 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Vertical Teenage Engineering Motorized / Machined Fader
  return (
    <div className="flex flex-col items-center select-none group px-1">
      {/* Readout at Top */}
      <span className={`text-[9px] font-silkscreen ${theme.text} bg-black/70 px-1.5 py-0.5 rounded border border-[#2d3039] min-w-[34px] text-center mb-1.5`}>
        {displayValue !== undefined ? displayValue : value}
      </span>

      {/* Vertical Slider Chassis Slot */}
      <div className="relative w-8 h-28 bg-[#101114] rounded-lg border border-[#2d313c] flex items-center justify-center p-1 shadow-inner">
        {/* Measurement tick marks alongside slot */}
        <div className="absolute left-1 top-2 bottom-2 flex flex-col justify-between pointer-events-none">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="w-1 h-[1px] bg-[#3a3e4a]" />
          ))}
        </div>
        <div className="absolute right-1 top-2 bottom-2 flex flex-col justify-between pointer-events-none">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="w-1 h-[1px] bg-[#3a3e4a]" />
          ))}
        </div>

        {/* Center Fader Slot Gut */}
        <div className="relative w-2 h-24 bg-[#0a0b0d] rounded-full overflow-hidden border border-[#22242c]">
          {/* Active level fill from bottom up */}
          <div
            className={`absolute bottom-0 left-0 right-0 ${theme.trackActive} opacity-75`}
            style={{ height: `${percent}%` }}
          />
        </div>

        {/* Real hidden range input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-20"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center center',
          }}
        />

        {/* Physical Mechanical Fader Cap */}
        <div
          className={`pointer-events-none absolute w-7 h-4 rounded ${theme.thumb} border border-black/30 shadow-md ${theme.glow} flex items-center justify-center transition-all z-10`}
          style={{
            bottom: `calc(${percent}% * 0.78 + 8px)`,
          }}
        >
          {/* Grippy fader center notch */}
          <div className="w-4 h-[2px] bg-black/50 rounded-full" />
        </div>
      </div>

      {/* Label and Sublabel at bottom */}
      <div className="mt-1.5 text-center flex flex-col items-center">
        <span className="text-[10px] uppercase font-mono-te font-bold tracking-wider text-[#9ca1af] group-hover:text-white transition-colors">
          {label}
        </span>
        {subLabel && (
          <span className="text-[8px] font-mono-te text-[#646977]">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};
