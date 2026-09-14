import { originalDifficulty } from "./original-difficulty.js";
import { originalRandom } from "./original-rng.js";

// 0x4708b8–0x470b13. Raw memory callbacks must handle initial seed positions
// outside the 50×50 area; the original checks bounds only after the first move.
export function originalFeaturePatches({
  seed,
  environment,
  tableIndex,
  difficulty,
  readHeight,
  readFlags,
  writeTerrain,
  setFlags,
  writeHeight,
}) {
  if (
    !["parkland", "desert", "tropical", "links"].includes(environment) ||
    !Number.isInteger(tableIndex) ||
    tableIndex < 0 ||
    tableIndex > 15
  )
    throw Error("Unsupported original feature settings.");
  if (
    ![readHeight, readFlags, writeTerrain, setFlags, writeHeight].every(
      (f) => typeof f === "function",
    )
  )
    throw Error("Explicit original feature memory callbacks required.");
  const { code: originalFeatureLevel } = originalDifficulty(difficulty);
  const rng = originalRandom(seed),
    patches = [];
  for (let i = 0; i < 24; i++) {
    let row = Math.trunc(((i % 4) * 50) / 4) + 4 + rng.next(4);
    let column = Math.trunc((Math.trunc(i / 4) * 50) / 4) + 4 + rng.next(4);
    const origin = { row, column };
    const h = readHeight(row, column);
    if (!Number.isInteger(h) || h < 0 || h > 255)
      throw Error("Invalid original height byte.");
    let code = {
      parkland: h > 3 ? 12 : 17,
      desert: h > 3 ? 12 : 15,
      tropical: h > 3 ? 15 : 17,
      links: h > 3 ? 15 : 12,
    }[environment];
    if (
      originalFeatureLevel >= 2 &&
      rng.next(Math.trunc(8 / (originalFeatureLevel - 1))) === 0
    )
      code = 18;
    else if (i === 0) code = 18;
    if (tableIndex === 2 && (code === 8 || code === 18)) code = 12;
    let moves = 0,
      writes = 0;
    for (;;) {
      if (moves > 10000)
        throw Error("Original feature patch did not terminate.");
      if (!(readFlags(row, column) & 0x1000)) {
        writeTerrain(row, column, code);
        writes++;
        if (rng.next(8) === 0 && code === 18) setFlags(row, column, 0x100);
        if (code === 17) writeHeight(row, column, 3);
      }
      const axis = rng.next(2),
        delta = rng.next(2) === 0 ? -1 : 1;
      if (axis) row += delta;
      else column += delta;
      if (row < 0 || row >= 50 || column < 0 || column >= 50) break;
      moves++;
      if (moves > 4 && rng.next(16) === 0) break;
    }
    patches.push({ index: i, origin, code, writes });
  }
  return { patches, rngState: rng.state, draws: rng.draws };
}
