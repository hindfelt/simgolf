import { RULES } from "./rules.js";
export const shouldBecomeAngry = (v) =>
  !v.pro &&
  !v.paid &&
  !v.interrupted &&
  v.happiness === 0 &&
  v.mood <= RULES.angerMood &&
  v.scorecard.length < v.itinerary.length &&
  ["walking", "queue", "address"].includes(v.phase);
export function beginAnger(g, v) {
  v.anger = {
    until: g.time + RULES.angerSeconds,
    origin: { ...v.pos },
    leg: 0,
  };
  v.phase = "angry";
  v.path = [];
  v.wait = 0;
  v.comment = "This course is infuriating! I've had enough!";
}
export function stepAnger(
  g,
  v,
  dt,
  { route, walk, complain, interruptVisitor },
) {
  if (g.time >= v.anger.until) {
    interruptVisitor(g, v.id, "angry");
    return;
  }
  for (const other of g.guests)
    if (
      other !== v &&
      !other.paid &&
      other.phase !== "angry" &&
      Math.hypot(other.pos.x - v.pos.x, other.pos.z - v.pos.z) <
        RULES.angerRadius
    ) {
      const incident = `angry:${v.roundId}`;
      if (!other.happinessReactions.includes(incident)) {
        complain(g, other, incident);
        other.comment = "That angry golfer is spoiling everyone's round.";
      }
    }
  if (!v.path.length) {
    v.wait -= dt;
    if (v.wait > 0) return;
    const offsets = [
      [2, 0],
      [0, 2],
      [-2, 0],
      [0, -2],
    ];
    for (let attempt = 0; attempt < 4; attempt++) {
      const [dx, dz] = offsets[v.anger.leg++ % offsets.length];
      const p = route(g, v.pos, {
        x: v.anger.origin.x + dx,
        z: v.anger.origin.z + dz,
      });
      if (p) {
        v.path = p;
        v.afterWalk = "angry";
        break;
      }
    }
    if (!v.path.length) {
      v.wait = 1;
      return;
    }
  }
  walk(v, dt);
}
export function validateAnger(g) {
  for (const v of [...g.guests, ...(g.pro ? [g.pro] : [])]) {
    if (v.anger === undefined) {
      if (v.phase === "angry") throw Error("Missing anger state.");
      continue;
    }
    if (
      v.pro ||
      v.paid ||
      v.interrupted ||
      v.phase !== "angry" ||
      v.shot ||
      !Number.isFinite(v.anger.until) ||
      v.anger.until < g.time ||
      v.anger.until > g.time + RULES.angerSeconds ||
      !Number.isFinite(v.anger.origin?.x) ||
      !Number.isFinite(v.anger.origin?.z) ||
      !Number.isSafeInteger(v.anger.leg) ||
      v.anger.leg < 0
    )
      throw Error("Invalid anger state.");
  }
}
