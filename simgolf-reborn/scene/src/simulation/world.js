// Long tile-aligned reaches with short bevels at the stepped corners.
export const riverZ = (x) => {
  const step = (edge) => Math.max(0, Math.min(1, x - edge + 0.5));
  return 28 - 4 * step(-42) + 4 * step(24) - 4 * step(60);
};
export const riverWidth = () => 2.5;
export const riverPoints = [
  [-130, 28],
  [-42, 28],
  [-42, 24],
  [24, 24],
  [24, 28],
  [60, 28],
  [60, 24],
  [130, 24],
];
export function riverDistance(x, z) {
  return Math.min(
    ...riverPoints.slice(1).map(([bx, bz], i) => {
      const [ax, az] = riverPoints[i];
      const dx = Math.max(Math.min(ax, bx) - x, 0, x - Math.max(ax, bx));
      const dz = Math.max(Math.min(az, bz) - z, 0, z - Math.max(az, bz));
      return Math.max(dx, dz);
    }),
  );
}

export const GRID = { minX: -44, minZ: -34, width: 45, height: 72, size: 2 };
export const entrance = { x: -29, z: -14 };
export function key(c, r) {
  return r * GRID.width + c;
}
export function cellAt(x, z) {
  return {
    c: Math.floor((x - GRID.minX) / GRID.size),
    r: Math.floor((z - GRID.minZ) / GRID.size),
  };
}
export function center(c, r) {
  return {
    x: GRID.minX + (c + 0.5) * GRID.size,
    z: GRID.minZ + (r + 0.5) * GRID.size,
  };
}
export function inBounds(c, r) {
  return (
    Number.isInteger(c) &&
    Number.isInteger(r) &&
    c >= 0 &&
    r >= 0 &&
    c < GRID.width &&
    r < GRID.height
  );
}
export function blocked(c, r, g = null) {
  const { x, z } = center(c, r);
  if (g) return x > -39 && x < -19 && z > -32 && z < -15;
  return (
    (x > -39 && x < -19 && z > -32 && z < -15) ||
    [
      [-44, -12],
      [-11, -31],
      [46, -32],
      [40, 10],
      [-44, 17],
      [-27, 41],
      [45, 49],
    ].some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 3.7) ||
    (r < 42 && z > 43 && (x < -15 || x > 27))
  );
}
export function onBridge(x, z) {
  return Math.abs(x + 7) <= 1.35 && Math.abs(z - riverZ(-7)) <= 5.6;
}
export function naturalWater(x, z) {
  return riverDistance(x, z) < 2.8 && !onBridge(x, z);
}
