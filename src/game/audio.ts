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

/** White-noise burst through a swept bandpass filter — whooshes, rattles, applause all share this. */
function noiseBurst(d: number, freqFrom: number, freqTo: number, vol: number, q = 1) {
  if (S.muted || !AC) return;
  const len = Math.max(1, Math.floor(AC.sampleRate * d));
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = AC.createBufferSource();
  src.buffer = buf;
  const filt = AC.createBiquadFilter();
  filt.type = 'bandpass';
  filt.Q.value = q;
  const t0 = AC.currentTime;
  filt.frequency.setValueAtTime(freqFrom, t0);
  filt.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), t0 + d);
  const g = AC.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(filt);
  filt.connect(g);
  g.connect(AC.destination);
  src.start(t0);
  src.stop(t0 + d + 0.02);
}

export const sfx = {
  hit: () => tone(170, 0.09, 'square', 0.22),
  putt: () => tone(310, 0.05, 'square', 0.15),
  splash: () => tone(700, 0.28, 'sawtooth', 0.18, 110),
  thunk: () => tone(110, 0.1, 'triangle', 0.3),
  /** Swept-noise swing whoosh — played alongside `hit()` on every full shot. */
  whoosh: () => noiseBurst(0.2, 2400, 500, 0.14, 0.8),
  /** Bright metallic double-tick, e.g. ball off the flagstick. */
  clink: () => {
    tone(1800, 0.05, 'triangle', 0.12);
    setTimeout(() => tone(2200, 0.04, 'triangle', 0.08), 30);
  },
  hole: () => {
    noiseBurst(0.12, 900, 300, 0.1, 3); // cup rattle
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
  /** Scattered noise claps over ~1.2s — crowd applause for an eagle-or-better. */
  applause: () => {
    if (S.muted || !AC) return;
    for (let i = 0; i < 14; i++) {
      const delay = Math.random() * 900;
      setTimeout(() => noiseBurst(0.06 + Math.random() * 0.05, 3000, 1500, 0.05 + Math.random() * 0.05, 0.9), delay);
    }
  },
  /** A quick two-note chirp — ambient birdsong, triggered occasionally, never on an event. */
  bird: () => {
    const base = 1800 + Math.random() * 900;
    tone(base, 0.06, 'sine', 0.05, base * 1.4);
    setTimeout(() => tone(base * 0.8, 0.05, 'sine', 0.04, base * 1.2), 70);
  },
};
