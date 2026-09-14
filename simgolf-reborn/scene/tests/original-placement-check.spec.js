import { test, expect } from "@playwright/test";
import { originalPlacementCheck } from "../src/simulation/original-placement-check.js";
const base = {
  row: 20,
  column: 20,
  size: 4,
  type: 15,
  environmentCode: 0,
  readTerrain: () => 4,
  readFlags: () => 0,
  terrainMetadata: () => ({ category: 0, clearanceCost: 3 }),
  existingType: () => -1,
};
test("starting footprint checks 4×4 interior and requires some non-water border", () => {
  const reads = [];
  expect(
    originalPlacementCheck({
      ...base,
      readTerrain: (r, c) => {
        reads.push([r, c]);
        return 4;
      },
    }),
  ).toBe(0);
  expect(reads).toHaveLength(36);
  expect(reads[0]).toEqual([19, 19]);
  expect(reads.at(-1)).toEqual([24, 24]);
  const waterBorder = (r, c) =>
    r === 19 || r === 24 || c === 19 || c === 24 ? 17 : 4;
  expect(originalPlacementCheck({ ...base, readTerrain: waterBorder })).toBe(
    -1,
  );
  expect(
    originalPlacementCheck({ ...base, type: 4, readTerrain: waterBorder }),
  ).toBe(0);
  expect(
    originalPlacementCheck({
      ...base,
      readTerrain: (r, c) => (r === 19 && c === 19 ? 4 : waterBorder(r, c)),
    }),
  ).toBe(0);
});
test("interior restrictions and existing type matching preserve original exceptions", () => {
  for (const code of [0, 20, 21, 22])
    expect(originalPlacementCheck({ ...base, readTerrain: () => code })).toBe(
      -1,
    );
  for (const flags of [0x80, 0x8000, 0x400])
    expect(originalPlacementCheck({ ...base, readFlags: () => flags })).toBe(
      -1,
    );
  expect(
    originalPlacementCheck({
      ...base,
      readTerrain: () => 22,
      existingType: () => 15,
    }),
  ).toBe(0);
  expect(
    originalPlacementCheck({
      ...base,
      type: 0,
      readTerrain: () => 21,
      readFlags: () => 0x80,
    }),
  ).toBe(0);
  expect(
    originalPlacementCheck({ ...base, type: 0, readFlags: () => 0x8000 }),
  ).toBe(-1);
});
test("clearance additions stack and type12 has environment-specific water rules", () => {
  expect(
    originalPlacementCheck({
      ...base,
      readTerrain: () => 12,
      terrainMetadata: () => ({ category: 13, clearanceCost: 3 }),
    }),
  ).toBe(96);
  expect(originalPlacementCheck({ ...base, type: 12 })).toBe(-1);
  expect(
    originalPlacementCheck({ ...base, type: 12, environmentCode: 1 }),
  ).toBe(0);
  const waterInside = (r, c) =>
    r >= 20 && r < 24 && c >= 20 && c < 24 ? 17 : 4;
  expect(
    originalPlacementCheck({ ...base, type: 12, readTerrain: waterInside }),
  ).toBe(0);
  expect(originalPlacementCheck({ ...base, readTerrain: waterInside })).toBe(
    48,
  );
  expect(() =>
    originalPlacementCheck({ ...base, terrainMetadata: () => undefined }),
  ).toThrow(/metadata/);
});
