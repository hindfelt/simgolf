import { originalRandom } from "./original-rng.js";

// 0x470571–0x470792. Memory callbacks deliberately preserve original linear
// addressing: bank writes can use column 50, which aliases the following row.
// The caller owns terrain metadata and any memory beyond the 50×50 tile array.
export function originalRiver({
  geography,
  environment,
  seed,
  noise,
  readTerrain,
  writeTerrain,
  updateFlags,
  height,
}) {
  if (
    !["inland", "coastal", "island"].includes(geography) ||
    !["parkland", "desert", "tropical", "links"].includes(environment)
  )
    throw Error("Invalid original river property.");
  if (
    ![noise?.sample, readTerrain, writeTerrain, updateFlags, height].every(
      (f) => typeof f === "function",
    )
  )
    throw Error(
      "Original river requires explicit terrain, flag and height callbacks.",
    );
  const rng = originalRandom(seed);
  const path = [];
  if (geography === "island")
    return { path, rngState: rng.state, draws: rng.draws };
  let row = 16 + rng.next(16),
    column = 49,
    previousDirection = 0;
  while (row >= 0 && row <= 49 && column >= 0) {
    if (path.length >= 10000)
      throw Error("Original river routing did not terminate.");
    path.push({ row, column });
    writeTerrain(row, column, environment === "desert" ? 11 : 17);
    updateFlags(row, column, 0x1000, 0x100);
    if (rng.next(64) === 0) updateFlags(row, column, 0x100, 0);
    const bankRow = row + (rng.next(2) === 0 ? -1 : 1),
      bankColumn = column + 1;
    if (
      readTerrain(bankRow, bankColumn) !== 17 &&
      height(bankRow, bankColumn) === 3
    ) {
      const bankCode =
        environment === "desert" ? 10 : (~((bankRow + bankColumn) * 2) & 4) | 8;
      writeTerrain(bankRow, bankColumn, bankCode);
    }
    let bestValue = 999,
      nextRow = row,
      nextColumn = column + 1,
      direction;
    for (const candidate of [
      { direction: -2, row: row - 1, column },
      { direction: 0, row, column: column - 1 },
      { direction: 2, row: row + 1, column },
    ]) {
      const value = noise.sample(candidate.row * 128, candidate.column * 128);
      if (!Number.isInteger(value) || value < 0 || value > 512)
        throw Error("Invalid original river noise.");
      if (value < bestValue) {
        bestValue = value;
        nextRow = candidate.row;
        nextColumn = candidate.column;
        direction = candidate.direction;
      }
    }
    if (direction === -previousDirection) column--;
    else {
      row = nextRow;
      column = nextColumn;
    }
    previousDirection = direction;
    // In the original, this memory read occurs before coordinate bounds checks.
    if (readTerrain(row, column) === 17) break;
  }
  return { path, rngState: rng.state, draws: rng.draws };
}
