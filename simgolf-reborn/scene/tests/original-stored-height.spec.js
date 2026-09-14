import { test, expect } from "@playwright/test";
import { createOriginalStoredHeight } from "../src/simulation/original-stored-height.js";
import { originalDerivedMap } from "../src/simulation/original-derived-map.js";
import { originalTerrainMetadata } from "../src/simulation/original-terrain-metadata.js";
test("stored vertices retain unsigned values and original boundary exceptions", () => {
  const terrain = new Uint8Array(2500).fill(20),
    heights = new Uint8Array(2601).fill(200);
  const read = createOriginalStoredHeight({
    terrain,
    heights,
    originalFlags: 0,
  });
  expect(read(10, 10)).toBe(3);
  terrain[9 * 50 + 10] = 4;
  expect(read(10, 10)).toBe(200);
  terrain[9 * 50 + 10] = 20;
  terrain[10 * 50 + 11] = 4;
  expect(read(10, 10)).toBe(200);
  terrain[10 * 50 + 11] = 20;
  terrain[10 * 50 + 9] = 4;
  expect(read(10, 10)).toBe(3);
  terrain[10 * 50 + 10] = 17;
  expect(read(10, 10)).toBe(200);
  expect(read(50, 10)).toBe(3);
  expect(read(10, -1)).toBe(3);
  expect(
    createOriginalStoredHeight({ terrain, heights, originalFlags: 1 })(10, 10),
  ).toBe(3);
});
test("startup terrain metadata and stored heights compose through the complete map rebuild", () => {
  const terrain = new Uint8Array(2500).fill(4),
    heights = new Uint8Array(2601).fill(8),
    ownership = new Uint8Array(2500).fill(255);
  terrain[510] = 22;
  terrain[511] = 22;
  ownership[510] = 0;
  ownership[511] = 0;
  heights[11 * 51 + 11] = 12;
  const result = originalDerivedMap({
    terrain,
    ownership,
    readHeight: createOriginalStoredHeight({
      terrain,
      heights,
      originalFlags: 0,
    }),
    metadata: originalTerrainMetadata,
    originalFlags: 0x40000,
  });
  expect(result.surfaceHeights[510]).toBe(12);
  expect(result.surfaceHeights[511]).toBe(12);
  expect(result.originalFlags).toBe(0);
  expect(originalTerrainMetadata(22).flags).toBe(5);
  expect(originalTerrainMetadata(22).shape).toBe(16);
  expect(heights[10 * 51 + 10]).toBe(8);
});
