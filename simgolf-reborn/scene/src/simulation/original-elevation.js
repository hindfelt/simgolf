import { originalRandom } from "./original-rng.js";

// Static reconstruction: 0x466cb0, 0x466d90, 0x42d2b0, 0x47024a–0x4702eb.
// This supplies noise and settings, not the terrain-specific height overrides.
export function originalElevationSettings(slot, relief, originalFlags = 0) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 15)
    throw Error("Invalid original purchase slot.");
  if (!["flat", "rolling", "hilly"].includes(relief))
    throw Error("Invalid original relief.");
  if (
    !Number.isInteger(originalFlags) ||
    originalFlags < 0 ||
    originalFlags > 0xffffffff
  )
    throw Error("Invalid original flags.");
  const base = { flat: 48, rolling: 32, hilly: 16 }[relief];
  const divisor =
    base * [1.5, 1.25, 1, 0.75][Math.floor(slot / 4)] +
    (originalFlags & 0x1000000 ? 16 : 0);
  return { divisor, coordinateScale: relief === "hilly" ? 128 : 64 };
}

export function createOriginalElevationNoise(seed) {
  const rng = originalRandom(seed);
  // The original consumes 18×18 draws, even though the interpolator wraps at 16.
  const source = Array.from({ length: 18 }, () =>
    Array.from({ length: 18 }, () => rng.next(16)),
  );
  const lattice = Array.from({ length: 17 }, (_, row) =>
    Array.from({ length: 17 }, (_, col) => source[row % 16][col % 16]),
  );
  const interpolate = (x, y) => {
    x -= 128;
    y -= 128;
    const row = (x >> 8) & 15,
      col = (y >> 8) & 15;
    const fx = (x >> 3) & 31,
      fy = (y >> 3) & 31;
    return Math.trunc(
      (lattice[row][col] * (32 - fx) * (32 - fy) +
        lattice[row][col + 1] * (32 - fx) * fy +
        lattice[row + 1][col] * fx * (32 - fy) +
        lattice[row + 1][col + 1] * fx * fy) /
        32,
    );
  };
  return {
    rngState: rng.state,
    draws: rng.draws,
    sample(x, y) {
      // Bound inputs to the coordinate range needed by the map and river probes one tile outside it.
      if (![x, y].every((v) => Number.isInteger(v) && v >= -128 && v <= 6400))
        throw Error("Invalid original noise coordinate.");
      const a = x >> 2,
        b = y >> 2;
      const value = Math.trunc(
        Math.trunc(
          ((6 * interpolate(a, b) + 4 * interpolate(a * 2, b * 2)) * 7) / 64,
        ) / 2,
      );
      return Math.max(0, Math.min(512, value));
    },
  };
}
