// 0x40d880–0x40da97. Returns the original clearance cost, or -1.
// Metadata is supplied explicitly: its initialization has not been decoded.
export function originalPlacementCheck({
  row,
  column,
  size,
  type,
  environmentCode,
  readTerrain,
  readFlags,
  terrainMetadata,
  existingType,
}) {
  if (
    ![row, column, size, type].every(Number.isInteger) ||
    size < 0 ||
    size > 50
  )
    throw Error("Invalid original placement footprint.");
  const byte = (r, c) => {
    const code = readTerrain(r, c);
    if (!Number.isInteger(code) || code < 0 || code > 127)
      throw Error("Original placement requires explicit terrain codes.");
    return code;
  };
  let cost = 0,
    nonWaterBorder = false;
  for (let dr = -1; dr <= size; dr++) {
    for (let dc = -1; dc <= size; dc++) {
      const r = row + dr,
        c = column + dc,
        code = byte(r, c);
      if (dr === -1 || dc === -1 || dr === size || dc === size) {
        nonWaterBorder ||= code !== 17;
        continue;
      }
      const flags = readFlags(r, c);
      if (!Number.isInteger(flags) || flags < 0 || flags > 65535)
        throw Error("Original placement requires explicit tile flags.");
      if (type === 12) {
        if (
          !Number.isInteger(environmentCode) ||
          environmentCode < 0 ||
          environmentCode > 3
        )
          throw Error(
            "Original type12 placement requires its environment code.",
          );
        if ((environmentCode === 0 || environmentCode === 2) && code !== 17)
          return -1;
      }
      if (type !== 0) {
        if (code === 21) return -1;
        if ((code === 22 || flags & 0x400) && existingType(r, c) !== type)
          return -1;
        if (code === 0 || flags & 0x8080) return -1;
      }
      if (r < 0 || r >= 50 || c < 0 || c >= 50 || code === 20) return -1;
      const metadata = terrainMetadata(code);
      if (
        !metadata ||
        !Number.isInteger(metadata.category) ||
        !Number.isInteger(metadata.clearanceCost) ||
        metadata.clearanceCost < -128 ||
        metadata.clearanceCost > 127
      )
        throw Error("Original placement requires signed clearance metadata.");
      // These are separate additions in the executable, not an OR condition.
      if (metadata.category === 13) cost += metadata.clearanceCost;
      if (code === 12) cost += metadata.clearanceCost;
      if (code === 17 && type !== 12) cost += metadata.clearanceCost;
      if (code === 18) cost += metadata.clearanceCost;
      if (code === 19) cost += metadata.clearanceCost;
      if (flags & 0x8000) return -1;
    }
  }
  return nonWaterBorder || type === 0 || type === 4 ? cost : -1;
}
