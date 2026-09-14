import { test, expect } from "@playwright/test";
import { originalPropertyBoundary } from "../src/simulation/original-property-boundary.js";
import { originalRandom } from "../src/simulation/original-rng.js";

test("100-acre inland trimming preserves a central 30-by-30 area", () => {
  const result = originalPropertyBoundary({
    acres: 100,
    geography: "inland",
    seed: 1,
  });
  expect(result.inset).toBe(10);
  expect(result.terrainWrites.filter((v) => v === null)).toHaveLength(900);
  expect(result.terrainWrites[10 * 50 + 10]).toBe(null);
  expect(result.terrainWrites[9 * 50 + 10]).toBe(20);
  expect(result.terrainWrites[40 * 50 + 10]).toBe(20);
  expect(result.draws).toBe(0);
  expect(result.rngState).toBe(1);
});
test("coastal trimming leaves the first column open and 250 acres still trims once", () => {
  const result = originalPropertyBoundary({
    acres: 100,
    geography: "coastal",
    seed: 1,
  });
  expect(result.terrainWrites[25 * 50]).toBe(null);
  expect(result.terrainWrites.filter((v) => v === null)).toHaveLength(1200);
  expect(result.terrainWrites[49 * 50 + 25]).toBe(20);
  const largest = originalPropertyBoundary({
    acres: 250,
    geography: "inland",
    seed: 1,
  });
  expect(largest.inset).toBe(1);
  expect(largest.terrainWrites.filter((v) => v === null)).toHaveLength(48 * 48);
});
test("island trimming consumes fifty original draws and preserves unmodified flags", () => {
  const result = originalPropertyBoundary({
    acres: 100,
    geography: "island",
    seed: 1,
  });
  expect(result.draws).toBe(50);
  // Integer reference LCG computed independently with BigInt.
  let state = 1n;
  for (let i = 0; i < 50; i++)
    state = (state * 1103515245n + 12345n) & 0xffffffffn;
  expect(result.rngState).toBe(Number(state));
  expect(result.clearedFlagBits).toBe(0x320);
  expect(new Set(result.terrainWrites)).toEqual(new Set([17, null]));
  expect(result.terrainWrites[25 * 50 + 25]).toBe(null);
  expect(result.terrainWrites[0]).toBe(17);
  expect(
    originalPropertyBoundary({ acres: 100, geography: "island", seed: 1 }),
  ).toEqual(result);
  expect(
    originalPropertyBoundary({ acres: 100, geography: "island", seed: 2 })
      .terrainWrites,
  ).not.toEqual(result.terrainWrites);
});
test("original random picks reproduce integer arithmetic without accepting lossy inputs", () => {
  const rng = originalRandom(0xffffffff);
  let state = 0xffffffffn;
  for (const bound of [3, 16, 65535, 1]) {
    state = (state * 1103515245n + 12345n) & 0xffffffffn;
    expect(rng.next(bound)).toBe(
      Number((((state >> 16n) & 32767n) * BigInt(bound)) / 32768n),
    );
  }
  expect(() => rng.next(0)).toThrow();
  expect(() => originalRandom(-1)).toThrow();
  expect(() =>
    originalPropertyBoundary({ acres: 256, geography: "inland", seed: 1 }),
  ).toThrow();
  expect(() =>
    originalPropertyBoundary({ acres: 100, geography: "ocean", seed: 1 }),
  ).toThrow();
});
