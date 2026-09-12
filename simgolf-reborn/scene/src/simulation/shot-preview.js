import { takeShot } from './game.js';

// Predict on a copy: moving the pointer must never spend strokes or advance RNG.
export function shotPreview(game, target, technique) {
  const probe = structuredClone(game);
  if (!probe.pro || !takeShot(probe, probe.pro, target, technique).ok) return null;
  const s = probe.pro.shot;
  const flight = [], roll = [];
  const dx = s.landing.x - s.from.x, dz = s.landing.z - s.from.z;
  const length = Math.hypot(dx, dz) || 1;
  for (let i = 0; i <= 64; i++) {
    const t = i / 64 * (s.obstruction?.t ?? 1);
    const bend = Math.sin(Math.PI * t) * s.curve;
    flight.push({ x: s.from.x + dx * t - dz / length * bend,
      z: s.from.z + dz * t + dx / length * bend,
      lift: 4 * s.apex * t * (1 - t) });
  }
  if (s.obstruction) {
    flight.push({ ...s.obstruction.point, lift: 0 });
  } else {
    for (let i = 0; i <= 32; i++) {
      const t = i / 32, u = 1 - (1 - t) ** 2;
      let lift = 0;
      if (t < 0.2) lift = Math.sin(t / 0.2 * Math.PI) * s.bounce;
      else if (t < 0.33) lift = Math.sin((t - 0.2) / 0.13 * Math.PI) * s.bounce * 0.28;
      roll.push({ x: s.landing.x + (s.end.x - s.landing.x) * u,
        z: s.landing.z + (s.end.z - s.landing.z) * u, lift });
    }
  }
  return { flight, roll, end: s.end, obstructed: !!s.obstruction };
}
