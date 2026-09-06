// 0x40bcd0–0x40be36 and extrema helper 0x42eb90–0x42ec0f.
export function originalHeightExtrema(row, column, readHeight) {
  const values = [
    readHeight(row, column),
    readHeight(row + 1, column),
    readHeight(row + 1, column - 1),
    readHeight(row, column - 1),
  ];
  return { minimum: Math.min(...values), maximum: Math.max(...values) };
}
export function originalCornerHeight({
  row,
  column,
  direction,
  useCache = false,
  readHeight,
  readMetadataFlags,
  readSurfaceHeight,
  readCachedHeight,
}) {
  if (![row, column, direction].every(Number.isInteger))
    throw Error("Invalid original corner coordinates.");
  if (row < 0 || row >= 50 || column < 0 || column >= 50 || !(direction & 1))
    return 3;
  if (useCache) {
    const cached = readCachedHeight(row, column, direction);
    if (cached !== 0) return cached;
  }
  const flags = readMetadataFlags(row, column);
  if (flags & 6) {
    if (flags & 1) return readSurfaceHeight(row, column);
    const extrema = originalHeightExtrema(row, column, readHeight);
    return flags & 2 ? extrema.minimum : extrema.maximum;
  }
  if (flags & 8) return 3;
  // Read all four vertices in the executable's order, even though one returns.
  const values = [
    readHeight(row + 1, column - 1),
    readHeight(row + 1, column),
    readHeight(row, column),
    readHeight(row, column - 1),
  ];
  return values[((direction & 7) - 1) / 2];
}

// First traversal of 0x42ee80, through 0x42ef6a. Later map passes are separate.
export function originalDirectionalHeightStage({
  readHeight,
  readMetadataFlags,
}) {
  const surfaceHeights = new Int8Array(2500),
    directionHeights = new Int8Array(20000);
  for (let row = 0; row < 50; row++)
    for (let column = 0; column < 50; column++) {
      const tile = row * 50 + column;
      for (const direction of [1, 3, 5, 7])
        directionHeights[tile * 8 + direction] = originalCornerHeight({
          row,
          column,
          direction,
          readHeight,
          readMetadataFlags,
          readSurfaceHeight: (r, c) => surfaceHeights[r * 50 + c],
        });
      const flags = readMetadataFlags(row, column);
      if (flags & 6) {
        const extrema = originalHeightExtrema(row, column, readHeight);
        if (flags & 2) surfaceHeights[tile] = extrema.minimum;
        if (flags & 4) surfaceHeights[tile] = extrema.maximum;
      }
    }
  return {
    surfaceHeights,
    directionHeights,
    stage: "before-derived-map-second-pass",
  };
}
