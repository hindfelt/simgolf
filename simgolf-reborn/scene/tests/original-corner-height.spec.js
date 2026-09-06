import { test, expect } from "@playwright/test";
import {
  originalCornerHeight,
  originalDirectionalHeightStage,
} from "../src/simulation/original-corner-height.js";
const base = {
  row: 10,
  column: 10,
  readHeight: (r, c) => r + c,
  readMetadataFlags: () => 0,
  readSurfaceHeight: () => 7,
};
test("corner mapping, extrema and cache precedence follow original terrain flags", () => {
  expect(
    [1, 3, 5, 7].map((direction) =>
      originalCornerHeight({ ...base, direction }),
    ),
  ).toEqual([20, 21, 20, 19]);
  for (const [flags, height] of [
    [2, 19],
    [4, 21],
    [6, 19],
    [3, 7],
    [5, 7],
    [8, 3],
  ])
    expect(
      originalCornerHeight({
        ...base,
        direction: 1,
        readMetadataFlags: () => flags,
      }),
    ).toBe(height);
  expect(originalCornerHeight({ ...base, direction: 2 })).toBe(3);
  expect(originalCornerHeight({ ...base, row: -1, direction: 1 })).toBe(3);
  expect(
    originalCornerHeight({
      ...base,
      direction: 1,
      useCache: true,
      readCachedHeight: () => -2,
    }),
  ).toBe(-2);
  expect(
    originalCornerHeight({
      ...base,
      direction: 1,
      useCache: true,
      readCachedHeight: () => 0,
    }),
  ).toBe(20);
});
test("first map traversal samples directions before writing the tile surface cache", () => {
  const result = originalDirectionalHeightStage({
    readHeight: (r, c) => r + c,
    readMetadataFlags: (r, c) => (r === 10 && c === 10 ? 3 : 0),
  });
  const tile = 510;
  expect(result.surfaceHeights[tile]).toBe(19);
  expect(
    [1, 3, 5, 7].map((d) => result.directionHeights[tile * 8 + d]),
  ).toEqual([0, 0, 0, 0]);
  expect(result.directionHeights[(tile + 1) * 8 + 3]).toBe(22);
  expect(
    result.directionHeights.filter((v, i) => i % 2 === 0).every((v) => v === 0),
  ).toBe(true);
  expect(result.surfaceHeights.filter((v) => v !== 0)).toHaveLength(1);
});
