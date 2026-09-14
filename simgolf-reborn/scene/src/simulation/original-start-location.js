import { originalRandom } from "./original-rng.js";
import { originalPlacementCheck } from "./original-placement-check.js";
import { originalBuildingMetadata } from "./original-building-metadata.js";

// 0x470d69–0x470dc8: select a valid type15 starting footprint.
// Placement mutation follows; this function does not place the object.
export function originalStartLocation({
  terrain,
  flags,
  baseCode,
  seed,
  terrainMetadata,
  existingType,
}) {
  if (
    !(terrain instanceof Uint8Array) ||
    terrain.length !== 2500 ||
    !(flags instanceof Uint16Array) ||
    flags.length !== 2500 ||
    !Number.isInteger(baseCode) ||
    baseCode < 0 ||
    baseCode > 22 ||
    typeof terrainMetadata !== "function" ||
    typeof existingType !== "function"
  )
    throw Error(
      "Original start location requires terrain, flags and explicit placement metadata.",
    );
  const rng = originalRandom(seed);
  const clubhouse = originalBuildingMetadata(15);
  for (let attempts = 1; attempts <= 100000; attempts++) {
    const row = rng.next(17) + 15,
      column = rng.next(17) + 15;
    if (terrain[row * 50 + column] !== baseCode) continue;
    const clearanceCost = originalPlacementCheck({
      row,
      column,
      size: clubhouse.baseSize,
      type: 15,
      readTerrain: (r, c) => terrain[r * 50 + c],
      readFlags: (r, c) => flags[r * 50 + c],
      terrainMetadata,
      existingType,
    });
    if (clearanceCost === -1) continue;
    return {
      row,
      column,
      type: 15,
      size: clubhouse.baseSize,
      clearanceCost,
      attempts,
      rngState: rng.state,
      draws: rng.draws,
    };
  }
  throw Error(
    "Original start location search exceeded its diagnostic attempt limit.",
  );
}
