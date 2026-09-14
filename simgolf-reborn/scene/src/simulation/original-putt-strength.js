import { originalRandom } from './original-rng.js';

// 0x421870: original planning estimate, which uses /8 motion and full
// resistance per iteration rather than the live update's /16 and half drag.
export function originalPuttRange(speed, rollCoefficient = 3) {
  if (!Number.isInteger(speed) || speed < 0 || speed > 100000 ||
      !Number.isInteger(rollCoefficient) || rollCoefficient < 0 || rollCoefficient > 8)
    throw Error('Unsupported original putt range inputs.');
  let distance = 0;
  do {
    distance += Math.trunc(speed / 8);
    const next = speed - (speed >> rollCoefficient);
    if (next === speed && speed >= 64)
      throw Error('Original putt range does not converge for this coefficient.');
    speed = next;
  } while (speed >= 64);
  return distance;
}

// Cold-cache mode-1 path of 0x4218e0. The shared ten-entry cache and its
// interaction with mode-0 airborne estimates are not modeled by this helper.
export function originalPuttStrength(distanceYards, rollCoefficient = 3) {
  if (!Number.isInteger(distanceYards) || distanceYards < 0 || distanceYards > 100)
    throw Error('Unsupported original putt planning distance.');
  const scaled = Math.trunc(distanceYards * 20 / 25);
  let speed = scaled * 33 - Math.trunc(scaled * scaled / 48) + 64;
  let step = Math.trunc(speed / 2);
  const target = Math.trunc(distanceYards * 1024 / 25);
  do {
    const range = originalPuttRange(speed, rollCoefficient);
    if (range > target) speed -= step;
    if (range < target) speed += step;
    step = Math.trunc(step / 2);
  } while (step > 2);
  return speed;
}

// 0x424c62 requests distance+2; 0x4256ec–0x425747 adds the final random
// strength adjustment and explicitly zeros vertical speed for club 13.
// seed is immediately before that final draw, not before all shot planning.
export function originalPuttLaunch({ distanceYards, rollCoefficient = 3, seed }) {
  if (!Number.isInteger(distanceYards) || distanceYards < 0 || distanceYards > 98)
    throw Error("Unsupported original putt launch distance.");
  const planned = originalPuttStrength(distanceYards + 2, rollCoefficient);
  const rng = originalRandom(seed);
  const bound = Math.trunc(planned / 8);
  const draw = rng.next(Math.max(1, bound));
  return { speed: planned + Math.trunc(planned / 12) - (bound ? draw : 0),
    verticalSpeed: 0, rngState: rng.state, draws: rng.draws };
}
