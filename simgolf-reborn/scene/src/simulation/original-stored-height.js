// Stored-height branch of 0x40be60, selected by nonzero 0x831828.
export function createOriginalStoredHeight({
  terrain,
  heights,
  originalFlags,
}) {
  if (
    !(terrain instanceof Uint8Array) ||
    terrain.length !== 2500 ||
    !(heights instanceof Uint8Array) ||
    heights.length !== 2601 ||
    !Number.isInteger(originalFlags) ||
    originalFlags < 0 ||
    originalFlags > 0xffffffff
  )
    throw Error(
      "Original stored height requires terrain, vertices and explicit flags.",
    );
  const unavailable = (r, c) =>
    r < 0 || r >= 50 || c < 0 || c >= 50 || terrain[r * 50 + c] === 20;
  return (row, column) => {
    if (!Number.isInteger(row) || !Number.isInteger(column))
      throw Error("Invalid original height coordinates.");
    if (originalFlags & 1 || row < 0 || row >= 50 || column < 0 || column >= 50)
      return 3;
    if (
      terrain[row * 50 + column] === 20 &&
      unavailable(row - 1, column) &&
      unavailable(row, column + 1)
    )
      return 3;
    return heights[row * 51 + column];
  };
}
