import { happinessReaction } from "./happiness.js";
import { center } from "./world.js";
// Original purpose: nearby flowers lift spirits. Radius and strength await measurement.
export function enjoyFlowers(g, v) {
  if (v.paid || v.phase !== "walking" || v.flowerHoleId === v.holeId)
    return false;
  const bed = g.facilities.find(
    (f) =>
      f.type === "flowerbed" &&
      Math.hypot(v.pos.x - center(f.c, f.r).x, v.pos.z - center(f.c, f.r).z) <=
        4,
  );
  if (!bed) return false;
  v.flowerHoleId = v.holeId;
  happinessReaction(v, `flowers:${v.holeId}`, 1);
  v.mood = Math.min(100, v.mood + 4);
  v.comment = "Lovely flowers along the course.";
  return true;
}
