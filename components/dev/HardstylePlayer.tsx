'use client';

import { useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';

type LoopHandles = {
  context: AudioContext;
  interval: number;
  master: GainNode;
};

const createKick = (context: AudioContext, destination: AudioNode, time: number) => {
  const osc = context.createOscillator();
  const gain = context.createGain();
  const drive = context.createWaveShaper();

  drive.curve = new Float32Array(256).map((_, index) => {
    const x = (index / 128) - 1;
    return Math.tanh(x * 5);
  });
  drive.oversample = '4x';

  osc.type = 'sine';
  osc.frequency.setValueAtTime(148, time);
  osc.frequency.exponentialRampToValueAtTime(44, time + 0.12);
  osc.frequency.setValueAtTime(52, time + 0.16);
  osc.frequency.exponentialRampToValueAtTime(38, time + 0.34);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(1, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.32, time + 0.22);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);

  osc.connect(drive);
  drive.connect(gain);
  gain.connect(destination);
  osc.start(time);
  osc.stop(time + 0.45);
};

const createLead = (context: AudioContext, destination: AudioNode, time: number, frequency: number) => {
  const osc = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(frequency, time);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, time);
  filter.Q.setValueAtTime(6, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.34, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.start(time);
  osc.stop(time + 0.2);
};

export default function HardstylePlayer() {
  const loopRef = useRef<LoopHandles | null>(null);
  const [playing, setPlaying] = useState(false);

  const stop = async () => {
    const loop = loopRef.current;
    if (!loop) return;
    window.clearInterval(loop.interval);
    loop.master.gain.exponentialRampToValueAtTime(0.0001, loop.context.currentTime + 0.08);
    window.setTimeout(() => {
      loop.context.close().catch(() => undefined);
    }, 120);
    loopRef.current = null;
    setPlaying(false);
  };

  const start = async () => {
    if (loopRef.current) {
      await stop();
      return;
    }

    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const master = context.createGain();
    const delay = context.createDelay();
    const feedback = context.createGain();

    master.gain.value = 1;
    delay.delayTime.value = 0.16;
    feedback.gain.value = 0.18;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(master);
    master.connect(context.destination);

    const bpm = 150;
    const step = 60 / bpm / 2;
    const melody = [220, 277.18, 329.63, 277.18, 246.94, 329.63, 369.99, 329.63];
    let index = 0;

    const schedule = () => {
      const now = context.currentTime + 0.04;
      for (let i = 0; i < 4; i += 1) {
        const time = now + i * step;
        if ((index + i) % 2 === 0) createKick(context, master, time);
        createLead(context, delay, time, melody[(index + i) % melody.length]);
      }
      index = (index + 4) % melody.length;
    };

    schedule();
    const interval = window.setInterval(schedule, step * 4 * 1000);
    loopRef.current = { context, interval, master };
    setPlaying(true);
  };

  return (
    <>
      {playing ? (
        <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden mix-blend-screen" aria-hidden="true">
          <div className="hardstyle-strobe absolute inset-0" />
          <div className="hardstyle-beam hardstyle-beam-a" />
          <div className="hardstyle-beam hardstyle-beam-b" />
          <div className="hardstyle-beam hardstyle-beam-c" />
          <div className="hardstyle-beam hardstyle-beam-d" />
          <div className="hardstyle-dots" />
        </div>
      ) : null}
      <button
        type="button"
        onClick={start}
        className="relative z-[80] inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        aria-pressed={playing}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        Hardstyle
        <Volume2 className="h-4 w-4 text-slate-300" />
      </button>
    </>
  );
}
