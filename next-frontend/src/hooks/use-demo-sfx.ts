'use client';

import { useCallback, useMemo, useState } from 'react';

const SFX_STORAGE_KEY = 'nexora.demo.sfx.enabled';

type SfxTone = {
  frequency: number;
  durationMs: number;
  gain: number;
  type?: OscillatorType;
};

function safeWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  return window;
}

function playToneSequence(tones: SfxTone[]) {
  if (!safeWindow()) return;
  const audioGlobal = globalThis as typeof globalThis & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioCtx = audioGlobal.AudioContext ?? audioGlobal.webkitAudioContext;
  if (!AudioCtx) return;

  const context = new AudioCtx();
  const startAt = context.currentTime;
  tones.forEach((tone, index) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = tone.type ?? 'sine';
    osc.frequency.value = tone.frequency;
    gain.gain.value = tone.gain;
    osc.connect(gain);
    gain.connect(context.destination);

    const offset = tones
      .slice(0, index)
      .reduce((acc, row) => acc + row.durationMs / 1000 + 0.01, 0);
    const toneStart = startAt + offset;
    const toneEnd = toneStart + tone.durationMs / 1000;
    osc.start(toneStart);
    osc.stop(toneEnd);
  });

  const totalDurationMs = tones.reduce((acc, tone) => acc + tone.durationMs + 12, 0);
  setTimeout(() => {
    void context.close();
  }, totalDurationMs + 50);
}

export function useDemoSfx(reducedMotion: boolean) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    const win = safeWindow();
    if (!win) return true;
    return win.localStorage.getItem(SFX_STORAGE_KEY) !== '0';
  });

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    const win = safeWindow();
    if (!win) return;
    win.localStorage.setItem(SFX_STORAGE_KEY, next ? '1' : '0');
  }, [enabled]);

  const canPlay = useMemo(() => enabled && !reducedMotion, [enabled, reducedMotion]);

  const playClick = useCallback(() => {
    if (!canPlay) return;
    playToneSequence([{ frequency: 420, durationMs: 45, gain: 0.015, type: 'triangle' }]);
  }, [canPlay]);

  const playTransition = useCallback(() => {
    if (!canPlay) return;
    playToneSequence([
      { frequency: 360, durationMs: 40, gain: 0.012, type: 'sine' },
      { frequency: 460, durationMs: 50, gain: 0.012, type: 'sine' },
    ]);
  }, [canPlay]);

  const playSuccess = useCallback(() => {
    if (!canPlay) return;
    playToneSequence([
      { frequency: 510, durationMs: 55, gain: 0.014, type: 'triangle' },
      { frequency: 640, durationMs: 65, gain: 0.016, type: 'triangle' },
    ]);
  }, [canPlay]);

  return {
    enabled,
    toggle,
    playClick,
    playTransition,
    playSuccess,
  };
}
