'use client';

import { useEffect, useState } from 'react';
import { isDevSessionActive } from '@/lib/isDevSessionClient';
import StyleThemePicker from '@/components/StyleThemePicker';

export default function DevOnlyStyleThemePicker() {
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    const sync = () => setIsDev(isDevSessionActive());
    sync();
    window.addEventListener('chemdeck-settings-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('chemdeck-settings-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (!isDev) return null;
  return <StyleThemePicker />;
}
