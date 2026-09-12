import { originalRandom } from "./original-rng.js";

// 0x40dcf0–0x40dfa0. Raw type IDs deliberately retain original behavior.
export function originalBuildingPaint({
  row,
  column,
  type,
  baseSize,
  sizeExtension,
  placementFlags,
  environmentCode,
  buildingMetadataByte,
  seed,
  terrain,
  heights,
  flags,
  ownership,
  tileMetadata,
}) {
  for (const [value, ctor, length] of [
    [terrain, Uint8Array, 2500],
    [heights, Uint8Array, 2601],
    [flags, Uint16Array, 2500],
    [ownership, Uint8Array, 2500],
    [tileMetadata, Uint8Array, 2500],
  ])
    if (!(value instanceof ctor) || value.length !== length)
      throw Error("Invalid original building map arrays.");
  if (
    ![
      row,
      column,
      type,
      baseSize,
      sizeExtension,
      placementFlags,
      environmentCode,
      buildingMetadataByte,
    ].every(Number.isInteger) ||
    type < 0 ||
    type > 15 ||
    baseSize < 1 ||
    sizeExtension < 0 ||
    environmentCode < 0 ||
    environmentCode > 3 ||
    buildingMetadataByte < 0 ||
    buildingMetadataByte > 255
  )
    throw Error("Invalid original building paint parameters.");
  const size =
    baseSize +
    (placementFlags === -2 ? 1 : 0) +
    (type >= 6 ? sizeExtension : 0);
  if (
    row < 0 ||
    column < 0 ||
    row + size > 50 ||
    column + size > 50 ||
    (type === 10 && size <= 2)
  )
    throw Error("Original building paint footprint outside supported map.");
  const result = {
    terrain: terrain.slice(),
    heights: heights.slice(),
    flags: flags.slice(),
    ownership: ownership.slice(),
    tileMetadata: tileMetadata.slice(),
    size,
  };
  const rng = originalRandom(seed);
  for (let dr = 0; dr < size; dr++)
    for (let dc = 0; dc < size; dc++) {
      const r = row + dr,
        c = column + dc,
        tile = r * 50 + c;
      // Original leaves the last vertex of the first row untouched.
      if (dc < size - 1 || dr !== 0)
        result.heights[r * 51 + c] = result.heights[row * 51 + column];
      let code = type === 5 ? 21 : 22;
      if (dr !== 0 || dc !== 0) {
        if (type === 6) code = 1;
        if (type === 10) code = dr === size - 1 ? 5 : 4;
        if (type === 12 && (environmentCode === 0 || environmentCode === 2))
          code = 17;
      }
      result.terrain[tile] = code;
      result.tileMetadata[tile] = buildingMetadataByte;
      result.flags[tile] =
        (result.flags[tile] & ~0x1300) |
        (placementFlags > 0 ? placementFlags : 0);
      result.ownership[tile] = 255;
    }
  if (type === 10)
    for (const code of [1, 1, 1, 7]) {
      const dc = rng.next(size - 2),
        dr = rng.next(size - 2);
      result.terrain[(row + dr + 1) * 50 + column + dc + 1] = code;
    }
  return {
    ...result,
    anchor: type === 15 ? { row: row + 1, column: column + 1 } : null,
    rngState: rng.state,
    draws: rng.draws,
  };
}
