import { test, expect } from "@playwright/test";
import {
  createOriginalElevationNoise,
  originalElevationSettings,
} from "../src/simulation/original-elevation.js";

test("original relief divisor follows purchase-slot groups and the acreage override flag", () => {
  expect(
    [0, 4, 8, 12].map(
      (slot) => originalElevationSettings(slot, "flat").divisor,
    ),
  ).toEqual([72, 60, 48, 36]);
  expect(
    [0, 4, 8, 12].map(
      (slot) => originalElevationSettings(slot, "hilly").divisor,
    ),
  ).toEqual([24, 20, 16, 12]);
  expect(originalElevationSettings(15, "rolling", 0x1000000)).toEqual({
    divisor: 40,
    coordinateScale: 64,
  });
  expect(originalElevationSettings(0, "hilly").coordinateScale).toBe(128);
  expect(() => originalElevationSettings(16, "flat")).toThrow();
});

test("original noise preserves 324 random draws and independently calculated samples", () => {
  const noise = createOriginalElevationNoise(1);
  // Independent Python integer reconstruction of the decoded interpolation.
  expect([[0,0],[64,128],[1024,3200],[3200,1024],[6272,6272]].map(([x,y])=>noise.sample(x,y))).toEqual([83,91,129,115,140]);
  let state = 1n;
  for (let i = 0; i < 324; i++)
    state = (state * 1103515245n + 12345n) & 0xffffffffn;
  expect(noise.rngState).toBe(Number(state));
  expect(noise.draws).toBe(324);
  for (const x of [0, 64, 128, 1024, 3200, 6272]) {
    for (const y of [0, 64, 1024, 3200]) {
      const value = noise.sample(x, y);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(512);
      expect(createOriginalElevationNoise(1).sample(x, y)).toBe(value);
    }
  }
  expect(() => noise.sample(-129, 0)).toThrow();
  expect(() => noise.sample(0, 1.5)).toThrow();
});
