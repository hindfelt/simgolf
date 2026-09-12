import { facilityContains } from "./facilities.js";
import { ownsLand } from "./land-purchase.js";
import {
  GRID,
  key,
  inBounds,
  blocked,
  center,
  naturalWater,
  onBridge,
} from "./world.js";
export const LAND_TOOLS = [
  "raise",
  "lower",
  "rotate-tee",
  "bridge",
  "out-of-bounds",
  "clear-boundary",
];
export function elevationAt(g, x, z) {
  const u = (x - GRID.minX) / 2 - 0.5,
    v = (z - GRID.minZ) / 2 - 0.5,
    c = Math.floor(u),
    r = Math.floor(v),
    a = u - c,
    b = v - r;
  const h = (c, r) => (inBounds(c, r) ? g.elevation?.[key(c, r)] || 0 : 0);
  return (
    h(c, r) * (1 - a) * (1 - b) +
    h(c + 1, r) * a * (1 - b) +
    h(c, r + 1) * (1 - a) * b +
    h(c + 1, r + 1) * a * b
  );
}
export function isOut(g, p) {
  const c = Math.floor((p.x - GRID.minX) / 2),
    r = Math.floor((p.z - GRID.minZ) / 2);
  return !ownsLand(g, c, r) || !!g.outOfBounds?.[key(c, r)];
}
export function landCheck(g, tool, c, r, brush, hole) {
  const fail = (message) => ({ ok: false, message });
  if (tool === "rotate-tee")
    return !hole.tee
      ? fail("Place a tee first.")
      : hole.open ||
          [...g.guests, ...(g.pro ? [g.pro] : [])].some(
            (v) =>
              !v.paid &&
              v.itinerary?.includes(hole.id) &&
              v.phase !== "finished",
          )
        ? fail("Close this hole and finish its rounds before rotating the tee.")
        : { ok: true, cells: [], cost: 0 };
  const cells = [],
    rad = ["bridge"].includes(tool) ? 0 : Math.floor(brush / 2);
  for (let dr = -rad; dr <= rad; dr++)
    for (let dc = -rad; dc <= rad; dc++) {
      const a = c + dc,
        b = r + dr,
        p = center(a, b),
        k = key(a, b),
        t = g.tiles[k]?.type;
      if (
        !ownsLand(g, a, b) ||
        blocked(a, b, g) ||
        (!g.starterBridgeRemoved && onBridge(p.x, p.z)) ||
        g.facilities.some((f) => facilityContains(f, a, b, 1))
      )
        return fail(
          "Keep this work clear of buildings and the existing bridge.",
        );
      if (
        [...g.guests, ...(g.pro ? [g.pro] : [])].some(
          (v) =>
            Math.hypot(v.pos.x - p.x, v.pos.z - p.z) < 2 ||
            Math.hypot(v.ball.x - p.x, v.ball.z - p.z) < 2,
        )
      )
        return fail("Wait for golfers to clear this area.");
      const wet = t === "water";
      if (tool === "bridge" && !wet)
        return fail("Place bridges over water, then join paths at both ends.");
      if (["raise", "lower"].includes(tool) && (wet || g.bridges?.[k]))
        return fail("Shape dry land beside the water and bridges.");
      if (
        ["raise", "lower"].includes(tool) &&
        Math.abs((g.elevation?.[k] || 0) + (tool === "raise" ? 0.5 : -0.5)) > 6
      )
        return fail("Maximum height change reached.");
      if (
        tool === "out-of-bounds" &&
        (wet || ["tee", "green", "path"].includes(t) || g.bridges?.[k])
      )
        return fail(
          "Mark out-of-bounds on land outside tees, greens and paths.",
        );
      cells.push({ c: a, r: b });
    }
  const changed = cells.filter(({ c, r }) =>
    tool === "bridge"
      ? !g.bridges?.[key(c, r)]
      : tool === "out-of-bounds"
        ? !g.outOfBounds?.[key(c, r)]
        : true,
  );
  // Original terrain elevation changes are free. Bridges and boundary stakes
  // retain their construction costs; no charge is recorded for reshaping land.
  const cost =
    changed.length *
    (tool === "bridge" ? 80 : tool === "out-of-bounds" ? 5 : 0);
  return cost > 0 && g.cash < cost
    ? fail("Not enough funds.")
    : { ok: true, cells, cost };
}
export function applyLand(g, tool, cells, hole) {
  if (tool === "rotate-tee") {
    hole.tee.direction = ((hole.tee.direction || 0) + 1) % 8;
    return;
  }
  for (const { c, r } of cells) {
    const k = key(c, r);
    if (tool === "raise" || tool === "lower") {
      g.elevation ??= {};
      const v = (g.elevation[k] || 0) + (tool === "raise" ? 0.5 : -0.5);
      if (v) g.elevation[k] = v;
      else delete g.elevation[k];
    }
    if (tool === "bridge") {
      g.bridges ??= {};
      g.bridges[k] = true;
    }
    if (tool === "out-of-bounds") {
      g.outOfBounds ??= {};
      g.outOfBounds[k] = true;
    }
    if (tool === "clear-boundary") delete g.outOfBounds?.[k];
  }
}
export function validateLand(g) {
  if (
    g.starterBridgeRemoved !== undefined &&
    typeof g.starterBridgeRemoved !== "boolean"
  )
    throw Error("Invalid starting bridge state.");
  for (const name of ["elevation", "bridges", "outOfBounds", "removedTrees"]) {
    const map = g[name] === undefined ? {} : g[name];
    if (!map || typeof map !== "object" || Array.isArray(map))
      throw Error("Invalid landscape data.");
    for (const [k, v] of Object.entries(map)) {
      const n = Number(k);
      if (
        String(n) !== k ||
        !Number.isInteger(n) ||
        n < 0 ||
        n >= GRID.width * GRID.height ||
        (name === "elevation"
          ? typeof v !== "number" ||
            !Number.isFinite(v) ||
            Math.abs(v) > 6 ||
            (v * 2) % 1 !== 0
          : v !== true)
      )
        throw Error("Invalid landscape data.");
    }
  }
  for (const k of Object.keys(g.bridges || {}))
    if (g.tiles[k]?.type !== "water")
      throw Error("Bridge needs water below it.");
  for (const h of g.holes)
    if (
      h.tee?.direction !== undefined &&
      (!Number.isInteger(h.tee.direction) ||
        h.tee.direction < 0 ||
        h.tee.direction > 7)
    )
      throw Error("Invalid tee direction.");
}

export function seedEditableStream(g) {
  if (g.editableWater) return;
  for (let r = 0; r < GRID.height; r++)
    for (let c = 0; c < GRID.width; c++) {
      const p = center(c, r);
      if (naturalWater(p.x, p.z) && !g.tiles[key(c, r)])
        g.tiles[key(c, r)] = { type: "water" };
    }
  g.editableWater = true;
}
