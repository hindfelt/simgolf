import catalog from "../content/original-terrain-metadata.json" with { type: "json" };

// Startup values, before any runtime terrain-table modifications.
export function originalTerrainMetadata(code) {
  if (!Number.isInteger(code) || code < 0 || code >= catalog.terrain.length)
    throw Error("Unknown original terrain code.");
  const { name, category, clearanceCost, rawMetadata } = catalog.terrain[code];
  const flags =
    (rawMetadata[12] |
      (rawMetadata[13] << 8) |
      (rawMetadata[14] << 16) |
      (rawMetadata[15] << 24)) >>>
    0;
  return {
    name,
    category,
    clearanceCost,
    flags,
    shape: rawMetadata[7],
    rollCoefficient: (rawMetadata[1] << 24) >> 24,
    connectionSpread: (rawMetadata[2] << 24) >> 24,
  };
}
