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
