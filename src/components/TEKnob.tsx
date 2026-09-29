import React, { useState, useEffect } from 'react';
import { teSound } from '../utils/sound';

interface KnobProps {
  label: string;
  subLabel?: string;
  value: number; // 0 to 100 or specific steps
  min?: number;
  max?: number;
  step?: number;
  color?: 'orange' | 'cyan' | 'yellow' | 'magenta' | 'aluminum' | 'dark';
  onChange?: (val: number) => void;
  displayValue?: string | number;
  indicatorPosition?: 'top' | 'dot';
}

const colorStyles: Record<string, { ring: string; top: string; dot: string; shadow: string }> = {
  orange: {
    ring: 'border-[#ff4c00]',
    top: 'bg-[#ff4c00]',
    dot: 'bg-white',
    shadow: 'shadow-[0_4px_10px_rgba(255,76,0,0.35)]',
  },
  cyan: {
    ring: 'border-[#00d2c4]',
    top: 'bg-[#00d2c4]',
    dot: 'bg-[#0b2422]',
    shadow: 'shadow-[0_4px_10px_rgba(0,210,196,0.35)]',
  },
  yellow: {
    ring: 'border-[#f8c822]',
    top: 'bg-[#f8c822]',
    dot: 'bg-[#292205]',
    shadow: 'shadow-[0_4px_10px_rgba(248,200,34,0.35)]',
  },
  magenta: {
    ring: 'border-[#ff2a70]',
    top: 'bg-[#ff2a70]',
    dot: 'bg-white',
    shadow: 'shadow-[0_4px_10px_rgba(255,42,112,0.35)]',
  },
  aluminum: {
    ring: 'border-[#a8a69f]',
    top: 'bg-[#d8d6ce]',
    dot: 'bg-[#333]',
    shadow: 'shadow-[0_4px_10px_rgba(0,0,0,0.25)]',
  },
  dark: {
    ring: 'border-[#2d3037]',
    top: 'bg-[#1b1c20]',
    dot: 'bg-[#ff4c00]',
    shadow: 'shadow-[0_4px_10px_rgba(0,0,0,0.4)]',
  },
};

export const TEKnob: React.FC<KnobProps> = ({
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
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startVal, setStartVal] = useState(value);

  // Map value to angle (-135deg to +135deg = 270deg sweep)
  const percent = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + percent * 270;

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY;
      const sensitivity = 0.8;
      const range = max - min;
      const change = (deltaY * sensitivity * range) / 100;
      let nextVal = startVal + change;
      if (step) {
        nextVal = Math.round(nextVal / step) * step;
      }
      nextVal = Math.max(min, Math.min(max, nextVal));
      if (nextVal !== value && onChange) {
        teSound.dialTick(color === 'cyan' || color === 'orange');
        onChange(nextVal);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startY, startVal, min, max, step, value, onChange, color]);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartVal(value);
    teSound.click(900, 0.01);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? step : -step;
    let nextVal = value + delta;
    nextVal = Math.max(min, Math.min(max, nextVal));
    if (nextVal !== value && onChange) {
      teSound.dialTick();
      onChange(nextVal);
    }
  };

  const theme = colorStyles[color] || colorStyles.orange;

  return (
    <div className="flex flex-col items-center select-none group">
      {/* Knob Dial Body */}
      <div
        className="relative w-14 h-14 cursor-ns-resize flex items-center justify-center"
        onMouseDown={onMouseDown}
        onWheel={handleWheel}
        title="Scroll or Drag up/down to adjust"
      >
        {/* Outer stepped rim / knurled dial */}
        <div
          className={`w-14 h-14 rounded-full border-2 border-[#383a42] bg-[#1a1c20] flex items-center justify-center ${theme.shadow} transition-transform active:scale-95`}
          style={{
            backgroundImage:
              'radial-gradient(circle, #2a2c32 30%, #161719 90%)',
          }}
        >
          {/* Subtle knurling notches around circle */}
          <div className="absolute inset-0 rounded-full border border-white/5" />

          {/* Rotating rotor head */}
          <div
            className={`w-10 h-10 rounded-full ${theme.top} flex items-center justify-center relative shadow-inner`}
            style={{
              transform: `rotate(${angle}deg)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            {/* Center machined depression */}
            <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-black/40" />
            </div>

            {/* Position indicator line / dot */}
            <div
              className={`absolute top-1 w-1.5 h-2.5 rounded-sm ${theme.dot} shadow-sm`}
            />
          </div>
        </div>
      </div>

      {/* Label and readout */}
      <div className="mt-1.5 text-center flex flex-col items-center">
        <span className="text-[10px] uppercase font-mono-te font-bold tracking-widest text-[#a0a5b0] group-hover:text-white transition-colors">
          {label}
        </span>
        <span className="text-[9px] font-silkscreen text-[#ff4c00] bg-black/50 px-1 rounded border border-[#ff4c00]/30 mt-0.5 min-w-[28px] text-center">
          {displayValue !== undefined ? displayValue : value}
        </span>
        {subLabel && (
          <span className="text-[8px] font-mono-te text-[#676c78]">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};
