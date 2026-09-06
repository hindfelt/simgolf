import { GRID, center } from "./world.js";
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
    .map(([k]) =>
      center(Number(k) % GRID.width, Math.floor(Number(k) / GRID.width)),
    );
  if (!trees.length) return null;
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
    for (const tree of trees) {
      const d = Math.hypot(point.x - tree.x, point.z - tree.z);
      if (
        (height <= TREE.height &&
          height >= TREE.canopyBottom &&
          d < TREE.radius) ||
        (height < TREE.canopyBottom && d < TREE.trunkRadius)
      )
        return { t, point, height };
    }
  }
  return null;
}
