import { key, inBounds } from "../simulation/world.js";
// Exposed water edges need rails; adjoining decks and dry-bank entrances remain open.
export function bridgeEdges(g, c, r) {
  return [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].map(([dc, dr]) => {
    const nc = c + dc,
      nr = r + dr,
      inside = inBounds(nc, nr),
      k = inside ? key(nc, nr) : null;
    const deck = inside && !!g.bridges?.[k],
      water = inside && g.tiles[k]?.type === "water";
    return { dc, dr, rail: !inside || (water && !deck), deck };
  });
}
