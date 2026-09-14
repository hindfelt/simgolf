// 0x42ef6a–0x42efdd with 0x42ed10 and 0x42edc0.
// Metadata bytes are explicit because runtime tables can differ from startup.
export function originalSurfacePropagation({
  terrain,
  ownership,
  surfaceHeights,
  metadata,
}) {
  if (
    !(terrain instanceof Uint8Array) ||
    terrain.length !== 2500 ||
    !(ownership instanceof Uint8Array) ||
    ownership.length !== 2500 ||
    !(surfaceHeights instanceof Int8Array) ||
    surfaceHeights.length !== 2500 ||
    typeof metadata !== "function"
  )
    throw Error(
      "Original propagation requires terrain, ownership and signed surface heights.",
    );
  const result = surfaceHeights.slice();
  const neighbors = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  let passes = 0,
    totalChanges = 0;
  while (true) {
    if (++passes > 10000)
      throw Error("Original surface propagation did not converge.");
    let changes = 0;
    for (let row = 0; row < 50; row++)
      for (let column = 0; column < 50; column++) {
        const tile = row * 50 + column,
          code = terrain[tile],
          entry = metadata(code);
        if (
          !entry ||
          !Number.isInteger(entry.flags) ||
          !Number.isInteger(entry.shape)
        )
          throw Error(
            "Original propagation requires explicit terrain metadata flags and shape.",
          );
        if (!(entry.flags & 1)) continue;
        const propagate = (maximum, matchOwner) => {
          let changed = false;
          for (const [dr, dc] of neighbors) {
            const r = row + dr,
              c = column + dc;
            if (r < 0 || r >= 50 || c < 0 || c >= 50) continue;
            const neighbor = r * 50 + c;
            if (
              terrain[neighbor] === 20 ||
              terrain[neighbor] !== code ||
              (matchOwner && ownership[neighbor] !== ownership[tile])
            )
              continue;
            if (
              maximum
                ? result[neighbor] > result[tile]
                : result[neighbor] < result[tile]
            ) {
              result[tile] = result[neighbor];
              changed = true;
            }
          }
          return Number(changed);
        };
        if (entry.flags & 2) changes += propagate(false, false);
        if (entry.flags & 4) changes += propagate(true, entry.shape === 16);
      }
    totalChanges += changes;
    if (!changes)
      return {
        surfaceHeights: result,
        passes,
        totalChanges,
        stage: "before-edge-mask-rebuild",
      };
  }
}
