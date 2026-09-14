import { test, expect } from "@playwright/test";
import { originalEdgeHeights } from "../src/simulation/original-edge-heights.js";

const at = (row, column) => row * 51 + column;
test("equal edges update in original side order, preserving input and outer vertices", () => {
  const heights = new Uint8Array(2601).fill(4);
  const result = originalEdgeHeights({
    heights,
    seed: 1,
    readTerrain: (r, c) => (r === 10 && c === 10 ? 17 : 4),
  });
  expect(result.changes).toBe(3);
  expect(result.draws).toBe(0);
  expect(
    [at(10, 9), at(11, 9), at(11, 10), at(10, 10)].map(
      (i) => result.heights[i],
    ),
  ).toEqual([3, 3, 3, 4]);
  expect(heights.every((h) => h === 4)).toBe(true);
  expect(
    Array.from({ length: 51 }, (_, i) => result.heights[at(50, i)]),
  ).toEqual(Array(51).fill(4));
});

test("higher equal edges consume RNG only when changed; unequal edges remain", () => {
  const heights = new Uint8Array(2601).fill(5);
  const result = originalEdgeHeights({
    heights,
    seed: 1,
    readTerrain: (r, c) => (r === 10 && c === 10 ? 18 : 4),
  });
  expect(result.changes).toBe(3);
  expect(result.draws).toBe(3);
  expect(
    [at(10, 9), at(11, 9), at(11, 10), at(10, 10)].map(
      (i) => result.heights[i],
    ),
  ).toEqual([6, 4, 4, 5]);
  heights[at(10, 9)] = 7;
  heights[at(11, 9)] = 8;
  heights[at(11, 10)] = 9;
  expect(
    originalEdgeHeights({
      heights,
      seed: 1,
      readTerrain: (r, c) => (r === 10 && c === 10 ? 18 : 4),
    }).changes,
  ).toBe(0);
});

test("raw terrain traversal includes extra row and column and rejects missing memory", () => {
  const reads = [];
  const result = originalEdgeHeights({
    heights: new Uint8Array(2601).fill(5),
    seed: 1,
    readTerrain: (r, c) => {
      reads.push([r, c]);
      return 17;
    },
  });
  expect(result.changes).toBe(0);
  expect(result.draws).toBe(0);
  expect(reads).toContainEqual([50, 50]);
  expect(reads).toContainEqual([-1, 0]);
  expect(() =>
    originalEdgeHeights({
      heights: result.heights,
      seed: 1,
      readTerrain: () => undefined,
    }),
  ).toThrow(/explicit terrain/);
});
