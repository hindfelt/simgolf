import { GRID, key, riverZ } from "./world.js";
const cache = new Map(),
  cells = new Map();
// Reproduces the existing presentation seed, including each tree's detail draws.
export function sceneryTrees(coastal = false) {
  if (cache.has(coastal)) return cache.get(coastal);
  let seed = 117;
  const rng = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const trees = [];
  const add = (x, z, size = 1) => {
    if (coastal && x >= 46) return;
    const height = (5 + rng() * 2) * size;
    trees.push({
      size,
      height,
      x,
      z,
      c: Math.floor((x - GRID.minX) / 2),
      r: Math.floor((z - GRID.minZ) / 2),
    });
    for (let i = 0; i < 596; i++) rng();
  };
  let count = 0;
  for (let attempts = 0; attempts < 1200 && count < 155; attempts++) {
    const x = rng() * 139 - 69.5,
      z = rng() * 117 - 62;
    if (
      !(z < -38 || x < -48 || x > 49 || (z > 43 && (x < -15 || x > 27))) ||
      Math.abs(z - riverZ(x)) < 5.5 ||
      (x > 5 && x < 38 && z > 25 && z < 54)
    )
      continue;
    add(x, z, 0.7 + rng() * 0.6);
    count++;
  }
  for (const [x, z, size] of [
    [-45, -26, 1.1],
    [-44, -12, 0.8],
    [-11, -31],
    [46, -32],
    [49, 1, 1.05],
    [40, 10, 0.8],
    [-44, 17],
    [45, 49],
    [-27, 41, 1.1],
    [-51, -35],
  ])
    add(x, z, size);
  cache.set(coastal, trees);
  cells.set(
    coastal,
    new Set(
      trees
        .filter(
          (t) => t.c >= 0 && t.c < GRID.width && t.r >= 0 && t.r < GRID.height,
        )
        .map((t) => key(t.c, t.r)),
    ),
  );
  return trees;
}
export function sceneryTreeAt(g, c, r) {
  const coastal = g.landscapeStyle === "coast";
  sceneryTrees(coastal);
  return !g.removedTrees?.[key(c, r)] && cells.get(coastal).has(key(c, r));
}
