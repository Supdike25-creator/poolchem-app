'use client';

import { useRef, useState } from 'react';
import { devPerspectiveMeta, type DevPerspective } from '@/lib/devPerspective';

const faces: DevPerspective[] = ['dev', 'manager', 'lifeguard'];
const faceAngle = 360 / faces.length;
const radius = 22;

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
  const [isDragging, setIsDragging] = useState(false);
  const activeIndex = faces.indexOf(value);
  const rotation = -activeIndex * faceAngle;

  const cycle = (direction: 1 | -1) => {
    const nextIndex = (activeIndex + direction + faces.length) % faces.length;
    onChange(faces[nextIndex]);
  };

  return (
    <div className={`dev-cylinder-shell ${compact ? 'dev-cylinder-shell-compact' : ''}`}>
      <div
        role="group"
        aria-label={`Switch perspective. Current: ${devPerspectiveMeta[value].label}`}
        className="dev-cylinder-scene"
        onPointerDown={(event) => {
          dragRef.current = { startX: event.clientX, moved: false };
          setIsDragging(false);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) return;
          const delta = event.clientX - dragRef.current.startX;
          if (Math.abs(delta) > 8) {
            dragRef.current.moved = true;
            setIsDragging(true);
          }
        }}
        onPointerUp={(event) => {
          if (!dragRef.current) return;
          const delta = event.clientX - dragRef.current.startX;
          if (dragRef.current.moved && Math.abs(delta) > 20) {
            cycle(delta > 0 ? -1 : 1);
          } else if (!dragRef.current.moved) {
            cycle(1);
          }
          dragRef.current = null;
          setIsDragging(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setIsDragging(false);
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
        <div
          className={`dev-cylinder ${isDragging ? 'dev-cylinder-dragging' : ''}`}
          style={{ transform: `rotateY(${rotation}deg)` }}
        >
          {faces.map((perspective, index) => {
            const meta = devPerspectiveMeta[perspective];
            const isFront = perspective === value;
            return (
              <div
                key={perspective}
                className={`dev-cylinder-face ${meta.tone} ${isFront ? 'dev-cylinder-face-active' : ''}`}
                style={{ transform: `rotateY(${index * faceAngle}deg) translateZ(${radius}px)` }}
              >
                <span className="dev-cylinder-letter">{meta.letter}</span>
                {!compact ? <span className="dev-cylinder-caption">{meta.label}</span> : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="dev-cylinder-dots">
        {faces.map((perspective) => {
          const meta = devPerspectiveMeta[perspective];
          const active = perspective === value;
          return (
            <button
              key={perspective}
              type="button"
              aria-label={`Switch to ${meta.label}`}
              onClick={() => onChange(perspective)}
              className={`dev-cylinder-dot ${active ? 'dev-cylinder-dot-active' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}
