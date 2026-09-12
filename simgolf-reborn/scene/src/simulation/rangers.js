import { RULES } from "./rules.js";
export const isMotivated = (g, v) =>
  !v.pro && !v.paid && v.motivatedUntil > g.time;
export function stepRanger(g, s, dt, walk) {
  if (s.phase === "walking") {
    walk(s, dt);
    return;
  }
  for (const v of g.guests) {
    if (
      v.paid ||
      !["queue", "address"].includes(v.phase) ||
      isMotivated(g, v) ||
      Math.hypot(v.pos.x - s.pos.x, v.pos.z - s.pos.z) > RULES.rangerRadius
    )
      continue;
    v.motivatedUntil = g.time + RULES.rangerMotivationSeconds;
    v.comment = "The ranger is right. Let's keep moving!";
    s.served++;
  }
}
