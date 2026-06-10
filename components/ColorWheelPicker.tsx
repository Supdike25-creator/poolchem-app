'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clamp,
  hexToHsl,
  hexToRgb,
  hslToHex,
  normalizeHex,
  rgbToHsl,
  type Hsl,
} from '@/lib/styleTheme';

type ColorWheelPickerProps = {
  value: string;
  onChange: (hex: string) => void;
};

const WHEEL_SIZE = 220;
const WHEEL_RING = 28;

const pickHueFromWheel = (clientX: number, clientY: number, rect: DOMRect) => {
  const x = clientX - rect.left - rect.width / 2;
  const y = clientY - rect.top - rect.height / 2;
  const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
  return (angle + 360) % 360;
};

const pickSlFromSquare = (clientX: number, clientY: number, rect: DOMRect, hue: number) => {
  const x = clamp((clientX - rect.left) / rect.width, 0, 1);
  const y = clamp((clientY - rect.top) / rect.height, 0, 1);
  const saturation = x * 100;
  const lightness = 100 - y * 100;
  return hslToHex({ h: hue, s: saturation, l: lightness });
};

export default function ColorWheelPicker({ value, onChange }: ColorWheelPickerProps) {
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const [hue, setHue] = useState(() => hexToHsl(value)?.h ?? 199);
  const [draggingWheel, setDraggingWheel] = useState(false);
  const [draggingSquare, setDraggingSquare] = useState(false);

  const normalized = normalizeHex(value) ?? '#0ea5e9';
  const hsl = useMemo(() => hexToHsl(normalized) ?? ({ h: 199, s: 92, l: 52 } as Hsl), [normalized]);

  const drawWheel = useCallback(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = WHEEL_SIZE;
    const center = size / 2;
    const outer = center - 2;
    const inner = outer - WHEEL_RING;

    ctx.clearRect(0, 0, size, size);

    for (let angle = 0; angle < 360; angle += 1) {
      const start = ((angle - 1) * Math.PI) / 180;
      const end = ((angle + 1) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, outer, start, end);
      ctx.closePath();
      ctx.fillStyle = hslToHex({ h: angle, s: 92, l: 52 });
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(center, center, inner, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    const markerAngle = ((hue - 90) * Math.PI) / 180;
    const markerRadius = (outer + inner) / 2;
    const mx = center + Math.cos(markerAngle) * markerRadius;
    const my = center + Math.sin(markerAngle) * markerRadius;
    ctx.beginPath();
    ctx.arc(mx, my, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
  }, [hue]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  useEffect(() => {
    setHue(hsl.h);
  }, [hsl.h]);

  const updateHue = (nextHue: number, keepLightness = true) => {
    setHue(nextHue);
    if (keepLightness) {
      onChange(hslToHex({ h: nextHue, s: hsl.s, l: hsl.l }));
    } else {
      onChange(hslToHex({ h: nextHue, s: 92, l: 52 }));
    }
  };

  const handleWheelPointer = (clientX: number, clientY: number) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    updateHue(pickHueFromWheel(clientX, clientY, canvas.getBoundingClientRect()));
  };

  const handleSquarePointer = (clientX: number, clientY: number) => {
    const square = document.getElementById('chemdeck-sl-square');
    if (!square) return;
    onChange(pickSlFromSquare(clientX, clientY, square.getBoundingClientRect(), hue));
  };

  useEffect(() => {
    if (!draggingWheel && !draggingSquare) return;

    const onMove = (event: PointerEvent) => {
      if (draggingWheel) handleWheelPointer(event.clientX, event.clientY);
      if (draggingSquare) handleSquarePointer(event.clientX, event.clientY);
    };

    const onUp = () => {
      setDraggingWheel(false);
      setDraggingSquare(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingWheel, draggingSquare, hue, hsl.l, hsl.s]);

  const squareBackground = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue} 100% 50%))`;
  const squareX = `${hsl.s}%`;
  const squareY = `${100 - hsl.l}%`;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex items-center justify-center">
        <canvas
          ref={wheelRef}
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          className="cursor-crosshair touch-none"
          onPointerDown={(event) => {
            setDraggingWheel(true);
            handleWheelPointer(event.clientX, event.clientY);
          }}
          aria-label="Hue color wheel"
        />
        <div
          id="chemdeck-sl-square"
          className="absolute h-[118px] w-[118px] cursor-crosshair touch-none overflow-hidden rounded-full border-4 border-white shadow-[0_8px_24px_rgba(15,23,42,0.28)]"
          style={{ background: squareBackground }}
          onPointerDown={(event) => {
            setDraggingSquare(true);
            handleSquarePointer(event.clientX, event.clientY);
          }}
        >
          <span
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
            style={{ left: squareX, top: squareY, backgroundColor: normalized }}
          />
        </div>
      </div>

      <label className="flex w-full items-center gap-3">
        <span
          className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 shadow-inner"
          style={{ backgroundColor: normalized }}
        />
        <input
          value={normalized}
          onChange={(event) => {
            const next = normalizeHex(event.target.value);
            if (!next) return;
            onChange(next);
            const rgb = hexToRgb(next);
            if (rgb) setHue(rgbToHsl(rgb).h);
          }}
          className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          spellCheck={false}
        />
      </label>
    </div>
  );
}
