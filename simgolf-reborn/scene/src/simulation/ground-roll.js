import { terrainRule } from "./terrain.js";

// Resolve ground travel in short deterministic segments. The caller supplies
// the launch/putt distance and slope bias; each crossed lie consumes that budget
// at its own resistance. No random draws or browser geometry enter this result.
export function groundRoll(from, proposed, surfaceAt, blocked = () => false, outOfBounds = () => false) {
  if (outOfBounds(from)) return { end: { ...from }, water: false };
  const initial = surfaceAt(from);
  if (initial === "water") return { end: { ...from }, water: true };
  const distance = Math.hypot(proposed.x - from.x, proposed.z - from.z);
  if (!distance) return { end: { ...proposed }, water: false };
  const base = Math.max(0.015, terrainRule(initial).roll);
  const dx = (proposed.x - from.x) / distance,
    dz = (proposed.z - from.z) / distance;
  let budget = distance,
    traveled = 0;
  // The fastest turf releases four units. This also bounds malformed/extreme
  // terrain callbacks without an unbounded integration loop.
  const maxSteps = Math.ceil((distance * Math.max(1, 4 / base)) / 0.05) + 2;
  for (let i = 0; i < maxSteps && budget > 1e-9; i++) {
    const probe = {
      x: from.x + dx * traveled,
      z: from.z + dz * traveled,
    };
    const surface = surfaceAt(probe);
    if (surface === "water") return { end: probe, water: true };
    const resistance = base / Math.max(0.015, terrainRule(surface).roll);
    const step = Math.min(0.05, budget / resistance);
    traveled += step;
    const next = { x: from.x + dx * traveled, z: from.z + dz * traveled };
    if (outOfBounds(next)) return { end: next, water: false };
    if (blocked(probe, next)) return { end: probe, water: false };
    if (surfaceAt(next) === "water") return { end: next, water: true };
    budget = Math.max(0, budget - step * resistance);
  }
  return {
    end: { x: from.x + dx * traveled, z: from.z + dz * traveled },
    water: false,
  };
}
