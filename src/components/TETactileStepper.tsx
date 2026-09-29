import React from 'react';
import { teSound } from '../utils/sound';
import { ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react';

interface StepperProps {
  label: string;
  subLabel?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  color?: 'orange' | 'cyan' | 'yellow' | 'magenta' | 'aluminum' | 'dark';
  onChange?: (val: number) => void;
  displayValue?: string | number;
}

const colorStyles: Record<string, { badge: string; buttonHover: string; led: string; text: string }> = {
  orange: {
    badge: 'border-[#ff4c00]/40 text-[#ff4c00] bg-[#ff4c00]/10',
    buttonHover: 'hover:bg-[#ff4c00] hover:text-white hover:border-[#ff4c00]',
    led: 'bg-[#ff4c00] shadow-[0_0_6px_#ff4c00]',
    text: 'text-[#ff4c00]',
  },
  cyan: {
    badge: 'border-[#00d2c4]/40 text-[#00d2c4] bg-[#00d2c4]/10',
    buttonHover: 'hover:bg-[#00d2c4] hover:text-black hover:border-[#00d2c4]',
    led: 'bg-[#00d2c4] shadow-[0_0_6px_#00d2c4]',
    text: 'text-[#00d2c4]',
  },
  yellow: {
    badge: 'border-[#f8c822]/40 text-[#f8c822] bg-[#f8c822]/10',
    buttonHover: 'hover:bg-[#f8c822] hover:text-black hover:border-[#f8c822]',
    led: 'bg-[#f8c822] shadow-[0_0_6px_#f8c822]',
    text: 'text-[#f8c822]',
  },
  magenta: {
    badge: 'border-[#ff2a70]/40 text-[#ff2a70] bg-[#ff2a70]/10',
    buttonHover: 'hover:bg-[#ff2a70] hover:text-white hover:border-[#ff2a70]',
    led: 'bg-[#ff2a70] shadow-[0_0_6px_#ff2a70]',
    text: 'text-[#ff2a70]',
  },
  aluminum: {
    badge: 'border-[#a0a5b2]/40 text-[#e5e7eb] bg-white/5',
    buttonHover: 'hover:bg-white hover:text-black hover:border-white',
    led: 'bg-white shadow-[0_0_6px_white]',
    text: 'text-white',
  },
  dark: {
    badge: 'border-[#333]/40 text-[#aaa] bg-black/40',
    buttonHover: 'hover:bg-[#444] hover:text-white',
    led: 'bg-[#ff4c00]',
    text: 'text-[#ff4c00]',
  },
};

export const TETactileStepper: React.FC<StepperProps> = ({
  label,
  subLabel,
  value,
  min = 0,
  max = 100,
  step = 1,
  color = 'orange',
  onChange,
  displayValue,
}) => {
  const theme = colorStyles[color] || colorStyles.orange;

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    let next = value - step;
    if (min !== undefined && next < min) {
      next = max; // wrap around for month/day convenience
    }
    teSound.click(800, 0.02);
    onChange?.(next);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    let next = value + step;
    if (max !== undefined && next > max) {
      next = min; // wrap around
    }
    teSound.click(1100, 0.02);
    onChange?.(next);
  };

  return (
    <div className="flex flex-col items-center select-none bg-[#101115] border border-[#262832] rounded-lg p-2 min-w-[95px] sm:min-w-[110px] shadow-sm">
      {/* Top Header Label + Mini LED */}
      <div className="flex items-center justify-between w-full mb-1.5 px-0.5">
        <span className="text-[9px] font-mono-te font-bold uppercase tracking-wider text-[#8a8f9e]">
          {label}
        </span>
        <span className={`w-1.5 h-1.5 rounded-full ${theme.led}`} />
      </div>

      {/* Center Tactile Click Rocker / Stepper */}
      <div className="flex items-center justify-between w-full bg-[#17191f] border border-[#2f323e] rounded-md p-1 gap-1">
        {/* Step Down Button */}
        <button
          type="button"
          onClick={handleDecrement}
          title={`Decrease ${label}`}
          className={`w-7 h-7 rounded bg-[#20222b] text-[#9ca1af] flex items-center justify-center border border-[#373a48] active:translate-y-0.5 active:bg-black transition-all ${theme.buttonHover}`}
        >
          <ChevronLeft size={15} strokeWidth={2.5} />
        </button>

        {/* Crisp Readout Badge */}
        <div className={`flex-1 text-center font-silkscreen text-xs font-bold py-1 px-1 rounded border ${theme.badge} select-none truncate tracking-wider`}>
          {displayValue !== undefined ? displayValue : value}
        </div>

        {/* Step Up Button */}
        <button
          type="button"
          onClick={handleIncrement}
          title={`Increase ${label}`}
          className={`w-7 h-7 rounded bg-[#20222b] text-[#9ca1af] flex items-center justify-center border border-[#373a48] active:translate-y-0.5 active:bg-black transition-all ${theme.buttonHover}`}
        >
          <ChevronRight size={15} strokeWidth={2.5} />
        </button>
      </div>

      {subLabel && (
        <span className="text-[8px] font-mono-te text-[#5c6170] mt-1">
          {subLabel}
        </span>
      )}
    </div>
  );
};
