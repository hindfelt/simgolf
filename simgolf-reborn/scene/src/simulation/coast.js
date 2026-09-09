// Seeded stepped shoreline continues across adjoining land parcels.
export function coastColumn(seed, row) {
  const phase =
    (((Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) *
    Math.PI *
    2;
  return (
    32 +
    Math.round(3 * Math.sin(row / 8 + phase) + 2 * Math.sin(row / 17 - phase))
  );
}

// Offshore parcels repeat beyond the starting property, so buying adjoining
// land reveals the continuation of the same seeded island chain.
export function coastalWater(seed, c, r) {
  if (c < coastColumn(seed, r)) return false;
  const rowOffset = (seed >>> 0) % 5;
  const localRow = (((r - rowOffset) % 20) + 20) % 20;
  const dc = Math.abs(c - 39);
  const dr = Math.abs(localRow - 11);
  // A seven-tile-wide island has room for a five-tile green and grass collar.
  // Bevel just the corners, retaining straight, tile-aligned reaches.
  const island = dc <= 3 && dr <= 4 && dc + dr <= 6;
  return !island;
}
