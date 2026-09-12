import { originalDifficulty } from "./original-difficulty.js";

// 0x42ea40 with recursive helper 0x42e820. Surrounding memory is explicit:
// the original neighbor reads use flat stride50 addresses without clipping.
export function originalConnections({
  terrainMemory,
  flagMemory,
  records,
  baseSize,
  sizeExtension,
  terrainSpreadValue,
  difficulty,
  originalFlags,
}) {
  if (
    !(terrainMemory instanceof Uint8Array) ||
    !(flagMemory instanceof Uint16Array) ||
    terrainMemory.length < 2600 ||
    flagMemory.length !== terrainMemory.length ||
    !(records instanceof Uint8Array) ||
    records.length !== 4096
  )
    throw Error(
      "Original connections require padded terrain/flag memory and records.",
    );
  const flags = flagMemory.slice(),
    resultRecords = records.slice(),
    view = new DataView(resultRecords.buffer);
  const address = (r, c) => {
    const i = 50 + r * 50 + c;
    if (i < 0 || i >= flags.length)
      throw Error("Connection reached unresolved surrounding memory.");
    return i;
  };
  for (let i = 50; i < 2550; i++) flags[i] &= ~0x40;
  const offsets = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const flood = (row, column) => {
    const stack = [{ row, column, side: -1 }];
    while (stack.length) {
      const frame = stack.at(-1),
        i = address(frame.row, frame.column);
      if (frame.side === -1) {
        if (flags[i] & 0x40) {
          stack.pop();
          continue;
        }
        flags[i] |= 0x40;
        if (terrainSpreadValue(terrainMemory[i]) <= 0) {
          stack.pop();
          continue;
        }
        frame.side = 0;
      }
      if (frame.side === 4) {
        stack.pop();
        continue;
      }
      const [dr, dc] = offsets[frame.side++],
        r = frame.row + dr,
        c = frame.column + dc,
        j = address(r, c);
      if (flags[j] & 0x420 && !(flags[j] & 0x40))
        stack.push({ row: r, column: c, side: -1 });
    }
  };
  const row = view.getInt16(2, true),
    column = view.getInt16(4, true),
    clubSize = baseSize(15);
  for (let dr = 0; dr < clubSize; dr++)
    for (let dc = 0; dc < clubSize; dc++)
      if (flags[address(row + dr, column + dc)] & 0x420)
        flood(row + dr, column + dc);
  const easy = originalDifficulty(difficulty).code === 0;
  for (let index = 0; index < 256; index++) {
    const offset = index * 16,
      type = view.getInt16(offset, true);
    if (type < 6) continue;
    if (type >= 17) {
      resultRecords[offset + 7] |= 0x40;
      continue;
    }
    resultRecords[offset + 7] &= ~0x40;
    const size = baseSize(type) + (type === 7 ? 0 : sizeExtension(type) - 1);
    const r = view.getInt16(offset + 2, true),
      c = view.getInt16(offset + 4, true);
    for (let dr = 0; dr < size; dr++)
      for (let dc = 0; dc < size; dc++)
        if (flags[address(r + dr, c + dc)] & 0x40)
          resultRecords[offset + 7] |= 0x40;
    if (easy || originalFlags & 0x1000000) resultRecords[offset + 7] |= 0x40;
  }
  return {
    flagMemory: flags,
    flags: flags.slice(50, 2550),
    records: resultRecords,
  };
}
