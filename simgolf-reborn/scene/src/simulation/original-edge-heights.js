import { originalRandom } from "./original-rng.js";

// 0x470c23–0x470d69. Terrain uses stride 50; vertices use stride 51.
// readTerrain must preserve raw addressing, including outside logical bounds.
export function originalEdgeHeights({ heights, readTerrain, seed }) {
  if (!(heights instanceof Uint8Array) || heights.length !== 2601)
    throw Error("Original edge shaping requires 51×51 vertex heights.");
  if (typeof readTerrain !== "function")
    throw Error("Original edge shaping requires a raw terrain reader.");
  const result = heights.slice();
  const rng = originalRandom(seed);
  const rows = [0, 1, 1, 0, 0];
  const columns = [-1, -1, 0, 0, -1];
  const neighbors = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const terrain = (row, column) => {
    const value = readTerrain(row, column);
    if (!Number.isInteger(value) || value < 0 || value > 255)
      throw Error("Original edge shaping requires explicit terrain bytes.");
    return value;
  };
  let changes = 0;
  // Both original loops include 50, even though terrain has stride 50.
  for (let row = 0; row <= 50; row++) {
    for (let column = 0; column <= 50; column++) {
      if (![17, 18].includes(terrain(row, column))) continue;
      for (let side = 0; side < 4; side++) {
        const r = row + rows[side],
          c = column + columns[side];
        if (r < 0 || r >= 50 || c < 0 || c >= 50) continue;
        const [dr, dc] = neighbors[side];
        if (terrain(row + dr, column + dc) === 17) continue;
        const index = r * 51 + c;
        const height = result[index];
        if (height <= 3) continue;
        const next = (row + rows[side + 1]) * 51 + column + columns[side + 1];
        if (height !== result[next]) continue;
        result[index] = height === 4 ? 3 : height + (rng.next(2) ? 1 : -1);
        changes++;
      }
    }
  }
  return { heights: result, changes, rngState: rng.state, draws: rng.draws };
}
