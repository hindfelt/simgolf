import { approachRoute } from "./approach-route.js";
import { isOut } from "./landforming.js";
import { terrainRule } from "./terrain.js";

// Provisional tactical policy, not a reconstruction of the retail AI.
// Probe fixed, independent dispersion samples: never inspect the live RNG's
// next outcome or mutate the authoritative round while considering a shot.
const SAMPLES = [17, 90210, 41573];
export function planShotWith(
  game,
  golfer,
  { golferHole, lie, shotLimit, takeShot },
  {
    samples = SAMPLES,
    fractions = [1, 0.85, 0.6, 0.35],
    degrees = [0, -30, 30, -60, 60, -90, 90, 180],
    shortlistSize = 6,
    techniques = ["draw", "fade", "backspin", "punch"],
  } = {},
) {
  if (!golfer || golfer.phase !== "address" || golfer.shot) return null;
  const cup = golferHole(game, golfer)?.green;
  if (!cup) return null;
  const distance = Math.hypot(cup.x - golfer.ball.x, cup.z - golfer.ball.z);
  if (lie(game, golfer.ball) === "green" && distance < 12)
    return { x: cup.x, z: cup.z, technique: "straight" };
  const remainingRoute = approachRoute(game, cup, lie);
  const range = shotLimit(game, golfer);
  const angle = Math.atan2(cup.z - golfer.ball.z, cup.x - golfer.ball.x);
  const candidates = [{ x: cup.x, z: cup.z }];
  for (const fraction of fractions)
    for (const degree of degrees) {
      const a = angle + (degree * Math.PI) / 180;
      candidates.push({
        x: golfer.ball.x + Math.cos(a) * range * fraction,
        z: golfer.ball.z + Math.sin(a) * range * fraction,
      });
    }
  function evaluate(target, technique) {
    let score = 0;
    for (const seed of samples) {
      const probe = structuredClone(game),
        actor = structuredClone(golfer);
      probe.rng = seed;
      if (!takeShot(probe, actor, target, technique).ok) {
        score = Infinity;
        break;
      }
      const shot = actor.shot,
        end = shot.end;
      const penalty = shot.waterLanding || isOut(probe, end);
      score +=
        (penalty ? 1000 : 0) +
        (shot.obstruction ? 80 : 0) +
        (Number.isFinite(remainingRoute(end))
          ? Math.hypot(cup.x-end.x,cup.z-end.z) + Math.max(0, remainingRoute(end) - 1.35 * (Math.abs(cup.x-end.x) + Math.abs(cup.z-end.z)))
          : 250 + Math.hypot(cup.x-end.x,cup.z-end.z)) -
        terrainRule(lie(probe, end)).preference;
    }
    return { target, technique, score };
  }
  // First find promising landing areas, then compare flight shapes there.
  // Keep the cup in the shortlist even if a straight approach is obstructed.
  // This bounds the extra work per shot on mobile browsers.
  const ranked = candidates
    .map((target) => evaluate(target, "straight"))
    .sort((a, b) => a.score - b.score);
  let best = ranked[0];
  const shortlist = [
    ...new Set([
      candidates[0],
      ...ranked.slice(0, shortlistSize).map((c) => c.target),
    ]),
  ];
  for (const target of shortlist)
    for (const technique of techniques) {
      const candidate = evaluate(target, technique);
      if (candidate.score < best.score) best = candidate;
    }
  return best && Number.isFinite(best.score)
    ? { ...best.target, technique: best.technique }
    : null;
}
