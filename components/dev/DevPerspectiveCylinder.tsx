'use client';

import { useEffect, useState } from 'react';
import {
  devPerspectiveMeta,
  type DevPerspective,
} from '@/lib/devPerspective';

const faces: DevPerspective[] = ['dev', 'manager', 'lifeguard'];
const faceAngle = 360 / faces.length;
const radius = 26;

type DevPerspectiveCylinderProps = {
  value: DevPerspective;
  onChange: (next: DevPerspective) => void;
  spinning?: boolean;
};

export default function DevPerspectiveCylinder({
  value,
  onChange,
  spinning = false,
}: DevPerspectiveCylinderProps) {
  const [dragStart, setDragStart] = useState<number | null>(null);
  const activeIndex = faces.indexOf(value);
  const rotation = -activeIndex * faceAngle;

  const cycle = (direction: 1 | -1) => {
    const nextIndex = (activeIndex + direction + faces.length) % faces.length;
    onChange(faces[nextIndex]);
  };

  useEffect(() => {
    if (!spinning) return;
    const timer = window.setInterval(() => {
      const nextIndex = (faces.indexOf(value) + 1) % faces.length;
      onChange(faces[nextIndex]);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [spinning, value, onChange]);

  return (
    <div className="dev-cylinder-shell">
      <button
        type="button"
        aria-label={`Switch perspective. Current: ${devPerspectiveMeta[value].label}`}
        className="dev-cylinder-scene"
        onClick={() => cycle(1)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault();
            cycle(1);
          }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            cycle(-1);
          }
        }}
        onPointerDown={(event) => setDragStart(event.clientX)}
        onPointerUp={(event) => {
          if (dragStart === null) return;
          const delta = event.clientX - dragStart;
          if (Math.abs(delta) > 24) {
            cycle(delta > 0 ? -1 : 1);
          }
          setDragStart(null);
        }}
        onPointerLeave={() => setDragStart(null)}
      >
        <div
          className={`dev-cylinder ${spinning ? 'dev-cylinder-auto-spin' : ''}`}
          style={{
            transform: `rotateY(${rotation}deg)`,
            ['--cylinder-rotation' as string]: `${rotation}deg`,
          }}
        >
          {faces.map((perspective, index) => {
            const meta = devPerspectiveMeta[perspective];
            return (
              <div
                key={perspective}
                className={`dev-cylinder-face ${meta.tone} ${perspective === value ? 'dev-cylinder-face-active' : ''}`}
                style={{ transform: `rotateY(${index * faceAngle}deg) translateZ(${radius}px)` }}
              >
                <span className="dev-cylinder-letter">{meta.letter}</span>
                <span className="dev-cylinder-caption">{meta.label}</span>
              </div>
            );
          })}
        </div>
        <div className="dev-cylinder-glow" aria-hidden />
      </button>

      <div className="mt-2 flex items-center justify-center gap-1">
        {faces.map((perspective) => {
          const meta = devPerspectiveMeta[perspective];
          const active = perspective === value;
          return (
            <button
              key={perspective}
              type="button"
              aria-label={`Switch to ${meta.label}`}
              onClick={() => onChange(perspective)}
              className={`h-2.5 rounded-full transition-all ${
                active ? 'w-6 bg-blue-500' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
