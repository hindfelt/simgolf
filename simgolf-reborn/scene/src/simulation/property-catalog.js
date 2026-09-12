// Fixed-width table observed in the supplied executable. Numeric field meanings
// include map coordinates and the original environment/coast/relief labels.
export const PROPERTY_RECORD_BYTES = 130;
export const PROPERTY_COUNT = 16;
export function parsePropertyRecords(bytes, offset) {
  if (
    !(bytes instanceof Uint8Array) ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset + PROPERTY_COUNT * PROPERTY_RECORD_BYTES > bytes.length
  )
    throw Error("Truncated property table.");
  const ids = new Set();
  const ascii = (record, start, end) => {
    const field = record.slice(start, end),
      nul = field.indexOf(0);
    if (
      nul <= 0 ||
      field.slice(nul).some((b) => b !== 0) ||
      field.slice(0, nul).some((b) => b < 32 || b > 126)
    )
      throw Error("Invalid property text.");
    return String.fromCharCode(...field.slice(0, nul));
  };
  return Array.from({ length: PROPERTY_COUNT }, (_, index) => {
    const sourceOffset = offset + index * PROPERTY_RECORD_BYTES;
    const record = bytes.slice(
      sourceOffset,
      sourceOffset + PROPERTY_RECORD_BYTES,
    );
    const originalId = record[24];
    if (originalId >= PROPERTY_COUNT || ids.has(originalId))
      throw Error("Invalid property ID.");
    ids.add(originalId);
    const environment = ["parkland", "desert", "tropical", "links"][record[62]];
    const geography = ["inland", "coastal", "island"][record[63]];
    const relief = ["flat", "rolling", "hilly"][record[64]];
    if (!environment || !geography || !relief)
      throw Error("Invalid property setup code.");
    return {
      originalId,
      environment,
      geography,
      relief,
      location: ascii(record, 0, 24),
      name: ascii(record, 25, 58),
      bonusLabel: ascii(record, 65, 130),
      sourceOffset,
      mapPoint: {
        x: record[58] | (record[59] << 8),
        y: record[60] | (record[61] << 8),
      },
      undecodedBytes: Array.from(record.slice(58, 65)),
    };
  });
}
