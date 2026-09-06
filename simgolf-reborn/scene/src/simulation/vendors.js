import { happinessReaction } from "./happiness.js";
import { RULES } from "./rules.js";
export const isRefreshmentStaff = (s) =>
  ["vendor", "consultant"].includes(s.role);
const wantsDrink = (s, v) =>
  v.thirst >= RULES.vendorThirst ||
  (s.role === "consultant" &&
    !v.happinessReactions?.includes(`consultant:${v.holeId}`));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function releaseRefreshment(g, s) {
  for (const v of g.guests)
    if (v.refreshmentStaffId === s.id) delete v.refreshmentStaffId;
  s.target = null;
  s.wait = 0;
  s.phase = "idle";
  s.path = [];
}
export function stepVendor(g, s, dt, setRoute, walk) {
  if (s.target === null && s.phase === "walking") {
    walk(s, dt);
    return;
  }
  if (s.target !== null) {
    const v = g.guests.find((v) => v.id === s.target);
    if (
      !v ||
      v.paid ||
      !wantsDrink(s, v) ||
      ["service", "angry", "departing", "departed"].includes(v.phase)
    ) {
      releaseRefreshment(g, s);
      return;
    }
    if (s.phase === "refreshing") {
      if (
        distance(s.pos, v.pos) > 1.8 ||
        !["queue", "address"].includes(v.phase)
      ) {
        releaseRefreshment(g, s);
        return;
      }
      s.wait += dt;
      if (s.wait >= RULES.vendorServiceSeconds) {
        v.thirst = 0;
        happinessReaction(
          v,
          `${s.role === "consultant" ? "consultant" : "vendor"}:${v.holeId}`,
          1,
        );
        v.comment =
          s.role === "consultant"
            ? "What thoughtful service! That drink brightened my day."
            : "A cool drink. Ready for more golf.";
        s.served++;
        g.stats.services++;
        releaseRefreshment(g, s);
      }
      return;
    }
    if (
      distance(s.pos, v.pos) < 1.8 &&
      ["queue", "address"].includes(v.phase)
    ) {
      s.phase = "refreshing";
      s.wait = 0;
      s.path = [];
      v.refreshmentStaffId = s.id;
      return;
    }
    s.wait -= dt;
    if (s.wait <= 0) {
      if (!setRoute(g, s, v.pos, "idle")) {
        releaseRefreshment(g, s);
        return;
      }
      s.wait = 1;
    }
    if (s.phase === "walking") walk(s, dt);
    return;
  }
  s.wait -= dt;
  if (s.wait > 0) return;
  s.wait = 1;
  const candidates = g.guests
    .filter(
      (v) =>
        !v.paid &&
        wantsDrink(s, v) &&
        !["service", "angry", "departing", "departed"].includes(v.phase) &&
        !g.staff.some(
          (other) =>
            other !== s &&
            other.targetKind === "guest" &&
            other.target === v.id,
        ),
    )
    .sort((a, b) => distance(s.pos, a.pos) - distance(s.pos, b.pos));
  for (const v of candidates)
    if (setRoute(g, s, v.pos, "idle")) {
      s.target = v.id;
      s.targetKind = "guest";
      s.wait = 1;
      return;
    }
}
