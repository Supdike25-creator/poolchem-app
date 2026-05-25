'use client';

import { useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';

type Vibe = 'hardstyle' | 'thunderstruck';
type ThunderstruckIntensity = 'low' | 'medium' | 'high';
type VibeConfig = {
  selectedVibe: Vibe | null;
  thunderstruck: {
    intensity: ThunderstruckIntensity;
    loop: boolean;
    startAtChorus: boolean;
  };
};

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioMessage, setAudioMessage] = useState('');
  const [config, setConfig] = useState<VibeConfig>({
    selectedVibe: null,
    thunderstruck: {
      intensity: 'medium',
      loop: true,
      startAtChorus: false,
    },
  });

  const playing = config.selectedVibe === 'hardstyle';
  const thunderstruckPlaying = config.selectedVibe === 'thunderstruck';
  const getThunderstruckVolume = (intensity: ThunderstruckIntensity) => ({
    low: 0.35,
    medium: 0.68,
    high: 1,
  })[intensity];

  const stop = async () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    const loop = loopRef.current;
    if (!loop) {
      setConfig((current) => ({ ...current, selectedVibe: null }));
      return;
    }
    window.clearInterval(loop.interval);
    loop.master.gain.exponentialRampToValueAtTime(0.0001, loop.context.currentTime + 0.08);
    window.setTimeout(() => {
      loop.context.close().catch(() => undefined);
    }, 120);
    loopRef.current = null;
    setConfig((current) => ({ ...current, selectedVibe: null }));
  };

  const selectHardstyle = async () => {
    setAudioMessage('');
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
    setConfig((current) => ({ ...current, selectedVibe: 'hardstyle' }));
  };

  const selectThunderstruck = async () => {
    setAudioMessage('');
    const existingAudio = audioRef.current;
    if (config.selectedVibe === 'thunderstruck' && existingAudio && !existingAudio.paused) {
      await stop();
      return;
    }

    if (loopRef.current) {
      await stop();
    }

    const audio = existingAudio ?? new Audio('/thunderstruck.mp3');
    audioRef.current = audio;
    audio.src = '/thunderstruck.mp3';
    audio.preload = 'auto';
    audio.onended = () => setConfig((current) => ({ ...current, selectedVibe: null }));

    audio.loop = config.thunderstruck.loop;
    audio.volume = getThunderstruckVolume(config.thunderstruck.intensity);
    audio.currentTime = config.thunderstruck.startAtChorus ? 60 : 0;
    try {
      await audio.play();
      setConfig((current) => ({ ...current, selectedVibe: 'thunderstruck' }));
    } catch (playError) {
      setAudioMessage((playError as Error).message || 'Browser blocked audio playback. Use the audio controls below.');
      setConfig((current) => ({ ...current, selectedVibe: 'thunderstruck' }));
    }
  };

  const updateThunderstruck = <Key extends keyof VibeConfig['thunderstruck']>(
    key: Key,
    value: VibeConfig['thunderstruck'][Key],
  ) => {
    const nextThunderstruck = {
      ...config.thunderstruck,
      [key]: value,
    };
    const audio = audioRef.current;
    if (audio) {
      audio.loop = nextThunderstruck.loop;
      audio.volume = getThunderstruckVolume(nextThunderstruck.intensity);
      if (key === 'startAtChorus' && config.selectedVibe === 'thunderstruck') {
        audio.currentTime = nextThunderstruck.startAtChorus ? 60 : 0;
      }
    }

    setConfig((current) => ({
      ...current,
      selectedVibe: 'thunderstruck',
      thunderstruck: nextThunderstruck,
    }));
  };

  const playNativeAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = config.thunderstruck.loop;
    audio.volume = getThunderstruckVolume(config.thunderstruck.intensity);
    await audio.play().catch((playError: unknown) => {
      setAudioMessage((playError as Error).message || 'Browser blocked audio playback.');
    });
  };

  return (
    <>
      <audio
        ref={audioRef}
        src="/thunderstruck.mp3"
        preload="auto"
        onEnded={() => setConfig((current) => ({ ...current, selectedVibe: null }))}
        onPlay={() => setConfig((current) => ({ ...current, selectedVibe: 'thunderstruck' }))}
        onPause={() => {
          if (audioRef.current?.ended) return;
          setConfig((current) => current.selectedVibe === 'thunderstruck' ? { ...current, selectedVibe: null } : current);
        }}
      />
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
      <div className="relative z-[80] flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={selectHardstyle}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            aria-pressed={playing}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            Hardstyle
            <Volume2 className="h-4 w-4 text-slate-300" />
          </button>
          <button
            type="button"
            onClick={selectThunderstruck}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            aria-pressed={thunderstruckPlaying}
          >
            {thunderstruckPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            Thunderstruck - AC/DC
            <Volume2 className="h-4 w-4 text-slate-300" />
          </button>
        </div>

        {config.selectedVibe === 'thunderstruck' ? (
          <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-3 text-slate-700 shadow-sm">
            <div className="grid gap-3">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Intensity</p>
                <div className="grid grid-cols-3 gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
                  {(['low', 'medium', 'high'] as ThunderstruckIntensity[]).map((intensity) => (
                    <button
                      key={intensity}
                      type="button"
                      onClick={() => updateThunderstruck('intensity', intensity)}
                      className={`rounded px-2 py-1.5 text-xs font-semibold capitalize transition ${
                        config.thunderstruck.intensity === intensity
                          ? 'bg-slate-950 text-white'
                          : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      {intensity}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                  Loop mode
                  <input
                    type="checkbox"
                    checked={config.thunderstruck.loop}
                    onChange={(event) => updateThunderstruck('loop', event.target.checked)}
                    className="h-4 w-4 accent-slate-950"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                  Start at chorus
                  <input
                    type="checkbox"
                    checked={config.thunderstruck.startAtChorus}
                    onChange={(event) => updateThunderstruck('startAtChorus', event.target.checked)}
                    className="h-4 w-4 accent-slate-950"
                  />
                </label>
              </div>

              <audio
                controls
                src="/thunderstruck.mp3"
                preload="auto"
                loop={config.thunderstruck.loop}
                className="h-9 w-full"
                onPlay={playNativeAudio}
              />
              {audioMessage ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  {audioMessage}
                </p>
              ) : null}

              <pre className="overflow-x-auto rounded-md bg-slate-950 px-3 py-2 text-[11px] leading-5 text-slate-100">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
