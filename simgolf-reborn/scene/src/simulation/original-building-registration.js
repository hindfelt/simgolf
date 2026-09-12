// 0x40dfa0–0x40e0d7, after terrain painting and before derived-map rebuilding.
export function originalBuildingRegistration({
  row,
  column,
  type,
  baseSize,
  sizeExtension,
  placementFlags,
  rotationByte,
  records,
  flags,
  ownership,
}) {
  if (
    !(records instanceof Uint8Array) ||
    records.length !== 4096 ||
    !(flags instanceof Uint16Array) ||
    flags.length !== 2500 ||
    !(ownership instanceof Uint8Array) ||
    ownership.length !== 2500
  )
    throw Error(
      "Original registration requires 256 records and 50×50 tile arrays.",
    );
  if (
    ![
      row,
      column,
      type,
      baseSize,
      sizeExtension,
      placementFlags,
      rotationByte,
    ].every(Number.isInteger) ||
    type < 0 ||
    type > 255 ||
    baseSize < 0 ||
    sizeExtension < 0 ||
    rotationByte < 0 ||
    rotationByte > 255
  )
    throw Error("Invalid original registration parameters.");
  const size = baseSize + sizeExtension;
  if (
    row < 0 ||
    column < 0 ||
    row >= 50 ||
    column >= 50 ||
    row + size > 50 ||
    column + size > 50
  )
    throw Error("Original registration footprint outside map.");
  const result = {
    records: records.slice(),
    flags: flags.slice(),
    ownership: ownership.slice(),
    index: null,
    needsMapRebuild: false,
  };
  if (placementFlags < 0) return result;
  result.flags[row * 50 + column] |= type + 1;
  const view = new DataView(result.records.buffer);
  let index = 0;
  while (index < 256 && view.getInt16(index * 16, true) !== -1) index++;
  // Original scan reads until a free record, then checks capacity. Do not read
  // beyond supplied records when a malformed/full table lacks that sentinel.
  if (index === 256) return { ...result, capacityExceeded: true };
  const offset = index * 16;
  view.setInt16(offset, type, true);
  view.setInt16(offset + 2, row, true);
  view.setInt16(offset + 4, column, true);
  // The executable uses type*16 here, rather than allocated index*16.
  view.setUint8(type * 16 + 7, 0);
  view.setUint32(offset + 12, 0, true);
  view.setUint32(offset + 8, 0, true);
  view.setUint8(offset + 6, rotationByte & 3);
  for (let dr = 0; dr < size; dr++)
    for (let dc = 0; dc < size; dc++) {
      const tile = (row + dr) * 50 + column + dc;
      result.ownership[tile] = index;
      result.flags[tile] = (result.flags[tile] & ~0x100) | 0x400;
    }
  return { ...result, index, needsMapRebuild: true };
}
