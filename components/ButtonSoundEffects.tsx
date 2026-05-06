'use client';

import { useEffect } from 'react';

type WebAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

const playTone = (frequency: number, duration: number, gainValue: number) => {
  const audioWindow = window as WebAudioWindow;
  const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  gain.gain.setValueAtTime(gainValue, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
};

export default function ButtonSoundEffects() {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-sound]') : null;
      if (!target || target.getAttribute('aria-disabled') === 'true') return;

      const sound = target.dataset.sound;
      if (sound === 'success') {
        playTone(720, 0.08, 0.025);
        return;
      }

      if (sound === 'back') {
        playTone(360, 0.06, 0.018);
        return;
      }

      playTone(520, 0.05, 0.018);
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return null;
}
