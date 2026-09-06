import { FACILITIES } from "./facilities.js";
import { footprint, newHole, event } from "./game.js";
import {
  GRID,
  riverDistance,
  key,
  inBounds,
  center,
  naturalWater,
  onBridge,
  blocked,
} from "./world.js";

export function reorderHoles(g, ids) {
  if (
    !Array.isArray(ids) ||
    ids.length !== g.holes.length ||
    new Set(ids).size !== ids.length ||
    !ids.every((id) => g.holes.some((h) => h.id === id))
  )
    return { ok: false, message: "Include each existing hole exactly once." };
  g.holes = ids.map((id) => g.holes.find((h) => h.id === id));
  g.revision++;
  event(g, "Hole order changed. Booked rounds keep their original route.");
  return {
    ok: true,
    message: "Order updated for new rounds. Booked rounds keep their route.",
  };
}
export function removalCheck(g, id) {
  const h = g.holes.find((h) => h.id === id);
  if (!h) return { ok: false, message: "Unknown hole." };
  if (h.open)
    return { ok: false, message: "Close this hole before removing it." };
  if (
    g.guests.some((v) => v.itinerary.includes(id)) ||
    (g.pro && g.pro.phase !== "finished" && g.pro.itinerary.includes(id))
  )
    return {
      ok: false,
      message:
        "Wait until booked golfers have finished and left this hole’s round.",
    };
  return {
    ok: true,
    message:
      "Remove this hole’s tee and green? Shared fairway and hazards remain.",
  };
}
export function removeHole(g, id) {
  const check = removalCheck(g, id);
  if (!check.ok) return check;
  const hole = g.holes.find((h) => h.id === id);
  g.retiredHoles.push({ id: hole.id, stats: { ...hole.stats } });
  g.holes = g.holes.filter((h) => h.id !== id);
  for (const [k, t] of Object.entries(g.tiles))
    if (t.holeId === id) delete g.tiles[k];
  if (g.pro?.phase === "finished" && g.pro.itinerary.includes(id)) g.pro = null;
  if (!g.holes.length) g.holes.push(newHole(`hole-${g.nextHoleId++}`));
  g.revision++;
  event(g, "Hole removed. Historical scores and fees have been retained.");
  return {
    ok: true,
    message: "Hole removed; historical results retained.",
    holeId: g.holes[0].id,
  };
}
export function demolitionCheck(g, c, r) {
  if (!inBounds(c, r) || blocked(c, r))
    return {
      ok: false,
      message: "This building or scenery is fixed on the current property.",
    };
  const p = center(c, r);
  if (!g.starterBridgeRemoved && onBridge(p.x, p.z)) {
    const crossing = (q) => q && onBridge(q.x, q.z);
    if (
      [...g.guests, ...g.staff, ...(g.pro ? [g.pro] : [])].some(
        (v) => crossing(v.pos) || crossing(v.ball) || v.path?.some(crossing),
      )
    )
      return {
        ok: false,
        message:
          "Wait until golfers and staff finish crossing the starting bridge.",
      };
    return {
      ok: true,
      kind: "starting-bridge",
      message:
        "Remove the starting bridge? Water will remain, and its approach paths will stay.",
    };
  }
  const f = g.facilities.find((f) =>
    footprint(f.type, f.c, f.r, 1, f.rotation || 0).some(
      (p) => p.c === c && p.r === r,
    ),
  );
  if (f) {
    if (
      [...g.guests, ...(g.pro ? [g.pro] : [])].some(
        (v) =>
          v.serviceId === f.id &&
          (v.phase === "service" ||
            (v.phase === "walking" && v.afterWalk === "service")),
      )
    )
      return {
        ok: false,
        message: "Wait until visitors finish using this facility.",
      };
    return {
      ok: true,
      kind: "facility",
      id: f.id,
      message: `Remove this ${FACILITIES[f.type].name}?`,
    };
  }
  const t = g.tiles[key(c, r)];
  if (!t) return { ok: false, message: "There is nothing to remove here." };
  if (t.holeId) {
    const check = removalCheck(g, t.holeId);
    return { ...check, kind: "hole", id: t.holeId };
  }
  if (
    [...g.guests, ...g.staff, ...(g.pro ? [g.pro] : [])].some(
      (v) =>
        Math.hypot(v.pos.x - p.x, v.pos.z - p.z) < 1.7 ||
        (v.ball && Math.hypot(v.ball.x - p.x, v.ball.z - p.z) < 1.4),
    )
  )
    return {
      ok: false,
      message: "Wait for people and balls to clear this tile.",
    };
  if (g.bridges?.[key(c, r)]) {
    if (
      [...g.guests, ...g.staff, ...(g.pro ? [g.pro] : [])].some((v) =>
        v.path?.some(
          (q) => Math.abs(q.x - p.x) < 1.01 && Math.abs(q.z - p.z) < 1.01,
        ),
      )
    )
      return {
        ok: false,
        message: "Wait for golfers and staff to finish crossing this bridge.",
      };
    return {
      ok: true,
      kind: "bridge",
      id: key(c, r),
      message: "Remove this bridge deck? The water will remain.",
    };
  }
  return {
    ok: true,
    kind: "terrain",
    id: key(c, r),
    message: "Restore this tile to rough?",
  };
}
export function demolish(g, c, r) {
  const check = demolitionCheck(g, c, r);
  if (!check.ok) return check;
  if (check.kind === "hole") return removeHole(g, check.id);
  if (check.kind === "starting-bridge") {
    g.starterBridgeRemoved = true;
    for (let r = 0; r < GRID.height; r++)
      for (let c = 0; c < GRID.width; c++) {
        const p = center(c, r);
        if (onBridge(p.x, p.z) && riverDistance(p.x, p.z) < 2.8)
          g.tiles[key(c, r)] = { type: "water" };
      }
  } else if (check.kind === "facility")
    g.facilities = g.facilities.filter((f) => f.id !== check.id);
  else if (check.kind === "bridge") delete g.bridges[check.id];
  else {
    delete g.tiles[check.id];
    delete g.bridges?.[check.id];
  }
  g.revision++;
  event(
    g,
    check.kind === "facility"
      ? "Facility removed."
      : ["bridge", "starting-bridge"].includes(check.kind)
        ? "Bridge removed; water remains."
        : "Terrain restored to rough.",
  );
  return { ok: true, message: "Removed. No refund is applied." };
}
