import { test, expect } from "@playwright/test";
import { originalConnections } from "../src/simulation/original-connections.js";
const make = () => {
  const records = new Uint8Array(4096).fill(255),
    v = new DataView(records.buffer);
  for (const [index, type, row, col] of [
    [0, 15, 20, 20],
    [1, 7, 20, 26],
    [2, 7, 30, 30],
  ]) {
    v.setInt16(index * 16, type, true);
    v.setInt16(index * 16 + 2, row, true);
    v.setInt16(index * 16 + 4, col, true);
  }
  const flagMemory = new Uint16Array(2600),
    terrainMemory = new Uint8Array(2600).fill(4);
  for (let c = 20; c <= 27; c++) flagMemory[50 + 1000 + c] = 0x420;
  return {
    records,
    flagMemory,
    terrainMemory,
    baseSize: (t) => (t === 15 ? 4 : 2),
    sizeExtension: () => 0,
    terrainSpreadValue: () => 1,
    difficulty: "Moderate",
    originalFlags: 0,
  };
};
test("clubhouse flood marks connected facilities and clears stale disconnected flags", () => {
  const input = make(),
    result = originalConnections(input);
  expect(result.records[23] & 0x40).toBe(0x40);
  expect(result.records[39] & 0x40).toBe(0);
  expect(result.flags[1026] & 0x40).toBe(0x40);
  expect(input.flagMemory[1076] & 0x40).toBe(0);
});
test("nonpositive terrain stops expansion, while easy mode bypasses facility connection requirement", () => {
  const input = make();
  input.terrainMemory[1074] = 1;
  const result = originalConnections({
    ...input,
    terrainSpreadValue: (code) => (code === 1 ? 0 : 1),
  });
  expect(result.flags[1024] & 0x40).toBe(0x40);
  expect(result.flags[1025] & 0x40).toBe(0);
  expect(result.records[23] & 0x40).toBe(0);
  expect(
    originalConnections({ ...input, difficulty: "Easy" }).records[39] & 0x40,
  ).toBe(0x40);
});
