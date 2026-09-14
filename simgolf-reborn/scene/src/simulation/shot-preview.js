import {airbornePoint,releasePoint} from './shot-motion.js';
import { takeShot, advanceLivePutt } from './game.js';

// Predict on a copy: moving the pointer must never spend strokes or advance RNG.
export function shotPreview(game, target, technique) {
  const probe = structuredClone(game);
  if (!probe.pro || !takeShot(probe, probe.pro, target, technique).ok) return null;
  const s = probe.pro.shot;
  const flight = [], roll = [];
  if (s.nativePutt) {
    roll.push({...s.from,lift:0});
    // Forecast with the copied shared clock/RNG. Other golfers may consume RNG
    // before this ball lands in live play; the forecast never modifies the game.
    for(let i=0;i<10000;i++) {
      probe.time+=.05;
      const step=advanceLivePutt(probe,s,.05);
      roll.push({...step.point,lift:0});
      if(step.done)return {flight,roll,end:step.point,obstructed:false};
    }
    return null;
  }
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
