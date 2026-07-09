import { S } from './state';

let AC: AudioContext | null = null;

export function ensureAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      /* audio unsupported */
    }
  }
  if (AC && AC.state === 'suspended') AC.resume();
}

function tone(f: number, d: number, type?: OscillatorType, vol?: number, slideTo?: number) {
  if (S.muted || !AC) return;
  const o = AC.createOscillator();
  const g = AC.createGain();
  const t0 = AC.currentTime;
  o.type = type || 'square';
  o.frequency.setValueAtTime(f, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + d);
  g.gain.setValueAtTime(vol || 0.2, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g);
  g.connect(AC.destination);
  o.start(t0);
  o.stop(t0 + d + 0.02);
}

export const sfx = {
  hit: () => tone(170, 0.09, 'square', 0.22),
  putt: () => tone(310, 0.05, 'square', 0.15),
  splash: () => tone(700, 0.28, 'sawtooth', 0.18, 110),
  thunk: () => tone(110, 0.1, 'triangle', 0.3),
  hole: () => {
    tone(660, 0.09, 'square', 0.18);
    setTimeout(() => tone(880, 0.14, 'square', 0.18), 90);
  },
  coin: () => {
    tone(990, 0.06, 'square', 0.12);
    setTimeout(() => tone(1250, 0.09, 'square', 0.12), 60);
  },
  err: () => tone(130, 0.13, 'sawtooth', 0.2),
  tada: () => {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'square', 0.15), i * 90));
  },
};
