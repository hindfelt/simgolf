import { originalRandom } from "./original-rng.js";

// Coastal-only pass 0x4707ae–0x470873, after river generation.
// Companion terrain metadata is not included. Inputs remain unchanged.
export function originalCoastline({ terrain, flags, seed }) {
  if (
    !(terrain instanceof Uint8Array) ||
    terrain.length !== 2500 ||
    !(flags instanceof Uint16Array) ||
    flags.length !== 2500
  )
    throw Error("Original coastline requires 50×50 terrain and flag arrays.");
  const result = terrain.slice(),
    resultFlags = flags.slice();
  const rng = originalRandom(seed);
  const widths = [];
  let width = 5,
    visited = 0;
  for (let row = 0; row < 50; row++) {
    if (width > 50)
      throw Error(
        "Original coastline exceeded the reconstructed map boundary.",
      );
    widths.push(width);
    for (let column = 0; column < width; column++) {
      const i = row * 50 + column;
      if (result[i] !== 17) {
        result[i] = 17;
        resultFlags[i] &= ~0x100;
        if (column === width - 1 && rng.next(16) === 0) resultFlags[i] |= 0x100;
      }
      // This executes even when the original byte was already 17.
      if (column === 0) result[i] = 20;
      visited++;
    }
    width += rng.next(5) - 2;
    if (width <= 1) width = 2;
    else if (width > 12) width--; // Original soft correction, NOT a clamp to 12.
  }
  return {
    terrain: result,
    flags: resultFlags,
    widths,
    nextWidth: width,
    visited,
    rngState: rng.state,
    draws: rng.draws,
  };
}
