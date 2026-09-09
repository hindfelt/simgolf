import { GRID, key } from '../simulation/world.js';

// Exposed edges only: adjacent marked tiles form one unbroken boundary.
export function boundaryEdges(marked = {}) {
  const edges = [];
  for (const k of Object.keys(marked)) {
    const c = Number(k) % GRID.width, r = Math.floor(Number(k) / GRID.width);
    const x = GRID.minX + c * GRID.size, z = GRID.minZ + r * GRID.size;
    const has = (dc, dr) => c + dc >= 0 && c + dc < GRID.width &&
      r + dr >= 0 && r + dr < GRID.height && marked[key(c + dc, r + dr)];
    if (!has(0, -1)) edges.push([[x,z],[x+2,z]]);
    if (!has(1, 0)) edges.push([[x+2,z],[x+2,z+2]]);
    if (!has(0, 1)) edges.push([[x+2,z+2],[x,z+2]]);
    if (!has(-1, 0)) edges.push([[x,z+2],[x,z]]);
  }
  return edges;
}
