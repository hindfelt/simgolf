import { RULES } from "./rules.js";
import { stepRanger } from "./rangers.js";
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function stepMarshall(g, s, dt, { setRoute, walk, interruptVisitor }) {
  if (s.marshallTarget !== undefined) {
    const v = g.guests.find(
      (v) => v.id === s.marshallTarget && v.phase === "angry",
    );
    if (!v) {
      delete s.marshallTarget;
      s.path = [];
      s.phase = "idle";
      s.wait = 0;
      return;
    }
    if (distance(s.pos, v.pos) < 1.8) {
      if (interruptVisitor(g, v.id, "ejected").ok)
        s.ejected = (s.ejected || 0) + 1;
      delete s.marshallTarget;
      s.path = [];
      s.phase = "idle";
      s.wait = 0;
      return;
    }
    s.wait -= dt;
    if (s.wait <= 0) {
      if (!setRoute(g, s, v.pos, "idle")) {
        delete s.marshallTarget;
        s.path = [];
        s.phase = "idle";
        return;
      }
      s.wait = 1;
    }
    if (s.phase === "walking") walk(s, dt);
    return;
  }
  if (s.phase !== "walking") {
    const candidates = g.guests
      .filter(
        (v) =>
          v.phase === "angry" &&
          distance(s.pos, v.pos) <= RULES.rangerRadius &&
          !g.staff.some((other) => other.marshallTarget === v.id),
      )
      .sort((a, b) => distance(s.pos, a.pos) - distance(s.pos, b.pos));
    for (const v of candidates)
      if (setRoute(g, s, v.pos, "idle")) {
        s.marshallTarget = v.id;
        s.wait = 1;
        return;
      }
  }
  stepRanger(g, s, dt, walk);
}
