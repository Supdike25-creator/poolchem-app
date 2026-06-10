'use client';

import { useDevSessionActive } from '@/hooks/useDevSessionActive';
import StyleThemePicker from '@/components/StyleThemePicker';

export default function DevOnlyStyleThemePicker() {
  const isDev = useDevSessionActive();
  if (!isDev) return null;
  return <StyleThemePicker />;
}
