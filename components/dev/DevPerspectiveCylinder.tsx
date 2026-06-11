'use client';

import { devPerspectiveMeta, type DevPerspective } from '@/lib/devPerspective';

const faces: DevPerspective[] = ['dev', 'manager', 'employee'];

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
  return (
    <div
      className={`dev-pov-modes ${compact ? 'dev-pov-modes-compact' : ''}`}
      role="group"
      aria-label="Switch dev perspective"
    >
      {faces.map((perspective) => {
        const meta = devPerspectiveMeta[perspective];
        const active = perspective === value;

        return (
          <button
            key={perspective}
            type="button"
            aria-label={`${meta.label} — ${meta.description}`}
            aria-pressed={active}
            title={meta.label}
            onClick={() => onChange(perspective)}
            className={`dev-pov-mode ${meta.modeClass} ${active ? 'dev-pov-mode-active' : ''}`}
          >
            <span className="dev-pov-mode-letter">{meta.letter}</span>
            <span className="dev-pov-mode-copy">
              <span className="dev-pov-mode-label">{meta.label}</span>
              <span className="dev-pov-mode-desc">{meta.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
