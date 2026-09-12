import { GRID, key, inBounds } from "./world.js";

export function greenCells(game, holeId) {
  return new Set(
    Object.entries(game.tiles)
      .filter(([, t]) => t.type === "green" && t.holeId === holeId)
      .map(([k]) => Number(k)),
  );
}
// Four-way connectivity matches construction and walking; diagonal contact
// alone must not produce an apparently connected but unusable putting surface.
export function connectedGreen(cells, cup) {
  if (!cup || !cells.has(key(cup.c, cup.r))) return false;
  const visited = new Set(),
    queue = [key(cup.c, cup.r)];
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i];
    if (visited.has(k)) continue;
    visited.add(k);
    const c = k % GRID.width,
      r = Math.floor(k / GRID.width);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = key(c + dc, r + dr);
      if (inBounds(c + dc, r + dr) && cells.has(next) && !visited.has(next))
        queue.push(next);
    }
  }
  return visited.size === cells.size;
}
