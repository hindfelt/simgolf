import { chooseTarget, takeShot, getHole, lie } from "./game.js";
import { cellAt, inBounds } from "./world.js";
const CASES = [
  ["All skills", null],
  ["No Length", "length"],
  ["No Accuracy", "accuracy"],
  ["No Imagination", "imagination"],
];
export function analyzeShots(game, holeId, from) {
  if (!Number.isFinite(from?.x) || !Number.isFinite(from?.z))
    throw Error("Choose playable ground on a completed hole.");
  const hole = getHole(game, holeId),
    cell = cellAt(from.x, from.z);
  if (
    !hole?.tee ||
    !hole.green ||
    !inBounds(cell.c, cell.r) ||
    ["water", "blocked"].includes(lie(game, from))
  )
    throw Error("Choose playable ground on a completed hole.");
  return CASES.map(([label, missing]) => {
    const actor = {
      id: 0,
      name: "Analysis",
      pro: false,
      ball: { ...from },
      pos: { ...from },
      phase: "address",
      holeId,
      itinerary: [holeId],
      holeIndex: 0,
      strokes: 0,
      energy: 90,
      mood: 60,
      skills: { length: true, accuracy: true, imagination: true },
      trained: {},
      shot: null,
    };
    if (missing) actor.skills[missing] = false;
    const target = chooseTarget(game, actor),
      samples = [];
    for (const seed of [17, 90210, 41573]) {
      const probe = structuredClone(game),
        v = structuredClone(actor);
      probe.rng = seed;
      if (!takeShot(probe, v, target, target.technique).ok)
        throw Error("Choose a starting point farther from the cup.");
      samples.push(v.shot);
    }
    const mean = (fn) =>
      samples.reduce((sum, s) => sum + fn(s), 0) / samples.length;
    return {
      label,
      technique: target.technique,
      samples,
      carry:
        mean((s) => {
          const landing = s.obstruction?.point ?? s.landing;
          return Math.hypot(landing.x - from.x, landing.z - from.z);
        }) * 4,
      remaining:
        mean((s) =>
          Math.hypot(s.end.x - hole.green.x, s.end.z - hole.green.z),
        ) * 4,
      hazards: samples.filter((s) => s.waterLanding || s.obstruction).length,
    };
  });
}
