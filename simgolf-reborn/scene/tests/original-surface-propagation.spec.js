import { test, expect } from "@playwright/test";
import { originalSurfacePropagation } from "../src/simulation/original-surface-propagation.js";
const input = () => ({
  terrain: new Uint8Array(2500).fill(20),
  ownership: new Uint8Array(2500),
  surfaceHeights: new Int8Array(2500),
  metadata: (code) => ({ flags: code === 17 ? 3 : 0, shape: 8 }),
});
test("connected matching water tiles reach their minimum across repeated scans", () => {
  const base = input();
  for (let c = 10; c <= 14; c++) {
    base.terrain[500 + c] = 17;
    base.surfaceHeights[500 + c] = 10;
  }
  base.surfaceHeights[514] = 3;
  base.terrain[516] = 17;
  base.surfaceHeights[516] = 8;
  const result = originalSurfacePropagation(base);
  expect(Array.from(result.surfaceHeights.slice(510, 515))).toEqual([
    3, 3, 3, 3, 3,
  ]);
  expect(result.surfaceHeights[516]).toBe(8);
  expect(result.passes).toBe(5);
  expect(result.totalChanges).toBe(4);
  expect(base.surfaceHeights[510]).toBe(10);
});
test("building-shaped maxima stop at ownership boundaries", () => {
  const base = input();
  base.metadata = (code) => ({ flags: code === 22 ? 5 : 0, shape: 16 });
  for (let c = 10; c <= 13; c++) {
    base.terrain[500 + c] = 22;
    base.surfaceHeights[500 + c] = c - 7;
    base.ownership[500 + c] = c < 12 ? 1 : 2;
  }
  const result = originalSurfacePropagation(base);
  expect(Array.from(result.surfaceHeights.slice(510, 514))).toEqual([
    4, 4, 6, 6,
  ]);
  const unrestricted = originalSurfacePropagation({
    ...base,
    metadata: (code) => ({ flags: code === 22 ? 5 : 0, shape: 7 }),
  });
  expect(Array.from(unrestricted.surfaceHeights.slice(510, 514))).toEqual([
    6, 6, 6, 6,
  ]);
});
