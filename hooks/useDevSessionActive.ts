'use client';

import { useEffect, useState } from 'react';
import { isDevSessionActive } from '@/lib/isDevSessionClient';

export function useDevSessionActive() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(isDevSessionActive());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('chemdeck-settings-change', sync);
    window.addEventListener('chemdeck-session-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('chemdeck-settings-change', sync);
      window.removeEventListener('chemdeck-session-change', sync);
    };
  }, []);

  return active;
}
