import {airbornePoint,releasePoint} from './shot-motion.js';
import { takeShot } from './game.js';

// Predict on a copy: moving the pointer must never spend strokes or advance RNG.
export function shotPreview(game, target, technique) {
  const probe = structuredClone(game);
  if (!probe.pro || !takeShot(probe, probe.pro, target, technique).ok) return null;
  const s = probe.pro.shot;
  const flight = [], roll = [];
  for (let i=0;i<=64;i++) flight.push(airbornePoint(s,i/64*(s.obstruction?.t??1)));
  if (s.obstruction) {
    flight.push({ ...s.obstruction.point, lift: 0 });
  } else {
    for (let i = 0; i <= 32; i++) {
      roll.push(releasePoint(s,i/32));
    }
  }
  return { flight, roll, end: s.end, obstructed: !!s.obstruction };
}
