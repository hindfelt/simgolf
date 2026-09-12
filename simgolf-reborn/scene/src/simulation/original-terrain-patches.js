import { originalRandom } from "./original-rng.js";

// Terrain-byte and flag-mask reconstruction of 0x4702eb–0x470571.
// Companion terrain metadata and later rivers/scenery are separate passes.
export function originalTerrainPatches({
  slot,
  environment,
  tableIndex,
  seed,
  originalFlags = 0,
}) {
  if (
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot > 15 ||
    !Number.isInteger(tableIndex) ||
    tableIndex < 0 ||
    tableIndex > 15 ||
    !Number.isInteger(originalFlags) ||
    originalFlags < 0 ||
    originalFlags > 0xffffffff
  )
    throw Error("Invalid original property setup.");
  if (!["parkland", "desert", "tropical", "links"].includes(environment))
    throw Error("Invalid original environment.");
  let baseCode = 4;
  if (!(originalFlags & 0x1000000)) {
    if (slot >= 8) baseCode = environment === "desert" ? 12 : 5;
    if (slot >= 12) baseCode = environment === "desert" ? 12 : 11;
  }
  const terrain = new Uint8Array(2500).fill(baseCode);
  const flagSetBits = new Uint16Array(2500);
  const flagClearBits = new Uint16Array(2500);
  const rng = originalRandom(seed);
  let totalWrites = 0,
    walks = 0;
  for (let budget = 5000; budget < 45000; budget += 2500) {
    let row = rng.next(50),
      column = rng.next(50),
      count = 0;
    let code;
    if (environment === "parkland")
      code = tableIndex === 9 ? 14 : column < 25 ? 13 : 14;
    if (environment === "desert") code = walks % 2 === 0 ? 14 : 12;
    if (environment === "tropical")
      code = walks % 2 === 0 ? 14 : ((walks & 2) | 24) >> 1;
    if (environment === "links") code = walks % 2 === 0 ? 5 : 11;
    while (
      row >= 0 &&
      row < 50 &&
      column >= 0 &&
      column < 50 &&
      count < Math.trunc(budget / 128)
    ) {
      const index = row * 50 + column;
      terrain[index] = code;
      count++;
      if (count === 48) flagSetBits[index] |= 0x2000;
      if (rng.next(64) === 0) {
        flagSetBits[index] |= 0x100;
        flagClearBits[index] &= ~0x100;
      } else {
        flagSetBits[index] &= ~0x100;
        flagClearBits[index] |= 0x100;
      }
      row += rng.next(3) - 1;
      column += rng.next(3) - 1;
    }
    walks++;
    totalWrites += count;
    if (totalWrites > 1250) break;
  }
  return {
    baseCode,
    terrain,
    flagSetBits,
    flagClearBits,
    totalWrites,
    walks,
    rngState: rng.state,
    draws: rng.draws,
  };
}
