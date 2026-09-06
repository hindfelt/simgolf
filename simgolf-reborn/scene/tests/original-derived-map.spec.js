import { test, expect } from "@playwright/test";
import {
  originalEdgeMask,
  originalDerivedMap,
} from "../src/simulation/original-derived-map.js";
test("edge comparison sets cardinal bits and skips excluded neighbors", () => {
  const base = {
    row: 10,
    column: 10,
    readTerrain: () => 4,
    readHeight: () => 3,
  };
  expect(
    originalEdgeMask({
      ...base,
      cornerHeight: (r, c) => (r === 10 && c === 10 ? 3 : 4),
    }),
  ).toBe(0x55);
  expect(
    originalEdgeMask({
      ...base,
      readTerrain: () => 20,
      cornerHeight: () => {
        throw Error("Excluded neighbor sampled");
      },
    }),
  ).toBe(0);
  const calls = [];
  expect(
    originalEdgeMask({
      ...base,
      cornerHeight: (r, c, d) => {
        calls.push([r, c, d]);
        return 3;
      },
    }),
  ).toBe(0);
  expect(calls.slice(0, 4)).toEqual([
    [10, 9, 5],
    [10, 10, -1],
    [10, 9, 3],
    [10, 10, 1],
  ]);
});
test("complete rebuild keeps original cache ordering and final origin flag changes", () => {
  const terrain = new Uint8Array(2500).fill(4),
    ownership = new Uint8Array(2500);
  terrain[510] = 17;
  terrain[511] = 17;
  const result = originalDerivedMap({
    terrain,
    ownership,
    readHeight: (r, c) => r + c,
    metadata: (code) => ({ flags: code === 17 ? 3 : 0, shape: 8 }),
    originalFlags: 0xffffffff,
  });
  expect(result.originalFlags).toBe(0xfffbffff);
  expect(result.invalidatedIndex).toBe(-1);
  expect(result.edgeMasks[0] & 8).toBe(8);
  expect(result.edgeMasks[0] & 2).toBe(0);
  expect(result.surfaceHeights[510]).toBe(19);
  expect(result.surfaceHeights[511]).toBe(19);
  expect(result.directionHeights[511 * 8 + 1]).toBe(0);
  expect(result.edgeMasks).toHaveLength(2500);
  expect(result.directionHeights).toHaveLength(20000);
  expect(terrain[510]).toBe(17);
});
