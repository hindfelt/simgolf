import { GRID, center, key } from "./world.js";
import { sceneryTrees } from "./scenery-trees.js";
import { elevationAt } from "./landforming.js";
export const TREE = {
  radius: 2.2,
  canopyBottom: 3.3,
  height: 7,
  trunkRadius: 0.24,
};
function collisionTrees(g) {
  const trees = Object.entries(g.tiles)
    .filter(([, v]) => v.type === "tree")
    .map(([k]) => ({
      ...center(Number(k) % GRID.width, Math.floor(Number(k) / GRID.width)),
      ...TREE,
    }));
  for (const tree of sceneryTrees(g.landscapeStyle === "coast")) {
    if (g.removedTrees?.[key(tree.c, tree.r)]) continue;
    trees.push({
      ...tree,
      radius: TREE.radius * tree.size,
      canopyBottom: tree.height * 0.45,
      height: tree.height * 1.3,
      trunkRadius: TREE.trunkRadius * tree.size,
    });
  }
  return trees;
}

export function treeCollision(g, shot) {
  if (shot.putt) return null;
  const trees = collisionTrees(g);
  // Exclude trees beyond the flight envelope before stepping the trajectory.
  const margin = Math.abs(shot.curve) + 3;
  const candidates = trees.filter((t) =>
    t.x >= Math.min(shot.from.x, shot.landing.x) - margin &&
    t.x <= Math.max(shot.from.x, shot.landing.x) + margin &&
    t.z >= Math.min(shot.from.z, shot.landing.z) - margin &&
    t.z <= Math.max(shot.from.z, shot.landing.z) + margin,
  );
  if (!candidates.length) return null;
  const dx = shot.landing.x - shot.from.x,
    dz = shot.landing.z - shot.from.z,
    len = Math.hypot(dx, dz) || 1;
  const steps = Math.max(
    32,
    Math.ceil((len + Math.abs(shot.curve) * 4) / 0.12),
  );
  for (let i = 1; i <= steps; i++) {
    const t = i / steps,
      bend = Math.sin(t * Math.PI) * shot.curve;
    const point = {
        x: shot.from.x + dx * t - (dz / len) * bend,
        z: shot.from.z + dz * t + (dx / len) * bend,
      },
      height = 4 * shot.apex * t * (1 - t);
    for (const tree of candidates) {
      const relativeHeight = height +
        elevationAt(g, point.x, point.z) - elevationAt(g, tree.x, tree.z);
      const d = Math.hypot(point.x - tree.x, point.z - tree.z);
      if (
        (relativeHeight <= tree.height &&
          relativeHeight >= tree.canopyBottom &&
          d < tree.radius) ||
        (relativeHeight >= 0 &&
          relativeHeight < tree.canopyBottom &&
          d < tree.trunkRadius)
      )
        return { t, point, height };
    }
  }
  return null;
}

// Test each ground segment against trunk footprints. Filter against a ray,
// not just the intended endpoint: faster turf can extend the roll beyond it.
export function treeGroundBlocker(g, from, proposed) {
  const dx = proposed.x - from.x, dz = proposed.z - from.z;
  const length = Math.hypot(dx, dz);
  if (!length) return () => false;
  const trees = collisionTrees(g).filter(tree => {
    const x = tree.x - from.x, z = tree.z - from.z;
    return (x * dx + z * dz) / length >= -tree.trunkRadius &&
      Math.abs(x * dz - z * dx) / length <= tree.trunkRadius;
  });
  return (a, b) => trees.some(tree => {
    const ax = a.x - tree.x, az = a.z - tree.z;
    const bx = b.x - tree.x, bz = b.z - tree.z;
    const radius2 = tree.trunkRadius ** 2;
    // Legacy balls or a landing inside a trunk can roll out, but not deeper in.
    const sx = b.x - a.x, sz = b.z - a.z;
    if (ax * ax + az * az < radius2 && ax * sx + az * sz >= 0 &&
      bx * bx + bz * bz > ax * ax + az * az) return false;
    const distance2 = sx * sx + sz * sz;
    const t = distance2 ? Math.max(0, Math.min(1, -(ax * sx + az * sz) / distance2)) : 0;
    return (ax + t * sx) ** 2 + (az + t * sz) ** 2 < radius2;
  });
}
