import { GRID, center, key } from "./world.js";
import { sceneryTrees } from "./scenery-trees.js";
import { elevationAt } from "./landforming.js";
export const TREE = {
  radius: 2.2,
  canopyBottom: 3.3,
  height: 7,
  trunkRadius: 0.24,
};
export function treeCollision(g, shot) {
  if (shot.putt) return null;
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
