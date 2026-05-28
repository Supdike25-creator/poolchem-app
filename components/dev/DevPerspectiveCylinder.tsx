'use client';

import { useRef } from 'react';
import { devPerspectiveMeta, type DevPerspective } from '@/lib/devPerspective';

const faces: DevPerspective[] = ['dev', 'manager', 'lifeguard'];
const faceAngle = 360 / faces.length;
const radius = 16;

type DevPerspectiveCylinderProps = {
  value: DevPerspective;
  onChange: (next: DevPerspective) => void;
  compact?: boolean;
};

export default function DevPerspectiveCylinder({
  value,
  onChange,
  compact = false,
}: DevPerspectiveCylinderProps) {
  const dragRef = useRef<{ startX: number; moved: boolean } | null>(null);
  const activeIndex = faces.indexOf(value);
  const rotation = -activeIndex * faceAngle;

  const cycle = (direction: 1 | -1) => {
    const nextIndex = (activeIndex + direction + faces.length) % faces.length;
    onChange(faces[nextIndex]);
  };

  return (
    <div className={`dev-pov-switcher ${compact ? 'dev-pov-switcher-compact' : ''}`}>
      <div
        role="group"
        aria-label={`Switch perspective. Current: ${devPerspectiveMeta[value].label}`}
        className="dev-pov-viewport"
        onPointerDown={(event) => {
          dragRef.current = { startX: event.clientX, moved: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) return;
          const delta = event.clientX - dragRef.current.startX;
          if (Math.abs(delta) > 8) dragRef.current.moved = true;
        }}
        onPointerUp={(event) => {
          if (!dragRef.current) return;
          const delta = event.clientX - dragRef.current.startX;
          if (dragRef.current.moved && Math.abs(delta) > 18) {
            cycle(delta > 0 ? -1 : 1);
          } else if (!dragRef.current.moved) {
            cycle(1);
          }
          dragRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
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
        tabIndex={0}
      >
        <div className="dev-pov-scene">
          <div className="dev-pov-drum" style={{ transform: `rotateY(${rotation}deg)` }}>
            {faces.map((perspective, index) => {
              const meta = devPerspectiveMeta[perspective];
              const isFront = perspective === value;
              return (
                <div
                  key={perspective}
                  className={`dev-pov-face ${meta.tone} ${isFront ? 'dev-pov-face-active' : ''}`}
                  style={{ transform: `rotateY(${index * faceAngle}deg) translateZ(${radius}px)` }}
                  aria-hidden={!isFront}
                >
                  <span className="dev-pov-letter">{meta.letter}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`dev-pov-segments ${compact ? 'sidebar-label hidden group-hover:flex group-focus-within:flex' : 'flex'}`}>
        {faces.map((perspective) => {
          const meta = devPerspectiveMeta[perspective];
          const active = perspective === value;
          return (
            <button
              key={perspective}
              type="button"
              aria-label={`Switch to ${meta.label}`}
              aria-pressed={active}
              onClick={() => onChange(perspective)}
              className={`dev-pov-segment ${active ? 'dev-pov-segment-active' : ''}`}
            >
              {meta.letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
