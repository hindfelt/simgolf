import { originalRandom } from "./original-rng.js";

// Reconstructs ONLY the final boundary-writing pass at 0x471896–0x4719a6.
// null means retain the preceding generator's terrain/flags at this tile.
// Original terrain codes remain raw until their complete semantics are decoded.
export function originalPropertyBoundary({ acres, geography, seed }) {
  if (!Number.isInteger(acres) || acres < 0 || acres > 255)
    throw Error("Original acreage must fit its unsigned byte.");
  if (!["inland", "coastal", "island"].includes(geography))
    throw Error("Unknown original geography.");
  const rng = originalRandom(seed);
  const terrainWrites = Array(2500).fill(null);
  let inset = 0;
  let halfWidth = 25;
  // A do/while is intentional: even the 250-acre override trims one edge tile.
  do {
    inset++;
    halfWidth--;
  } while (4 * halfWidth * halfWidth > acres * 10);
  const write = (row, column) => {
    terrainWrites[row * 50 + column] = geography === "island" ? 17 : 20;
  };
  if (geography === "island") {
    for (let axis = 0; axis < 50; axis++) {
      const width =
        Math.max(8, Math.min(50, Math.abs(axis - 25))) +
        inset -
        12 +
        rng.next(3);
      for (let edge = 0; edge < width; edge++) {
        write(edge, axis);
        write(axis, edge);
        write(axis, 49 - edge);
        write(49 - edge, axis);
      }
    }
  } else {
    for (let edge = 0; edge < inset; edge++) {
      for (let axis = 0; axis < 50; axis++) {
        write(edge, axis);
        if (geography === "inland") write(axis, edge);
        write(axis, 49 - edge);
        write(49 - edge, axis);
      }
    }
  }
  return {
    width: 50,
    height: 50,
    inset,
    terrainWrites,
    // The island helper clears these bits only on tiles it overwrites.
    clearedFlagBits: geography === "island" ? 0x0320 : 0,
    rngState: rng.state,
    draws: rng.draws,
  };
}
