import { RULES } from "./rules.js";
import { happinessReaction } from "./happiness.js";

// Greeting frequency and range are provisional until original runtime comparison.
export function stepGreeter(g, s, dt, walk) {
  if (s.phase === "walking") {
    walk(s, dt);
    return;
  }
  for (const v of g.guests) {
    if (
      v.paid ||
      !["walking", "queue", "address"].includes(v.phase) ||
      Math.hypot(v.pos.x - s.pos.x, v.pos.z - s.pos.z) > RULES.clubProRadius
    )
      continue;
    const welcome = happinessReaction(v, "club-pro-welcome", 1);
    const celebrity =
      s.role === "celebrity" && happinessReaction(v, "celebrity-welcome", 1);
    if (welcome || celebrity) {
      v.comment =
        s.role === "celebrity"
          ? "A celebrity came over to welcome me. What a day!"
          : "A friendly welcome from the club pro. Glad to be here!";
      s.served++;
    }
  }
}
