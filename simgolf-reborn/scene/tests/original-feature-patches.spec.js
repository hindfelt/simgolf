import { test, expect } from "@playwright/test";
import { originalFeaturePatches } from "../src/simulation/original-feature-patches.js";
function run(overrides = {}) {
  const writes = [],
    heights = [],
    flagWrites = [];
  const result = originalFeaturePatches({
    seed: 1,
    environment: "parkland",
    tableIndex: 0,
    difficulty: "Easy",
    readHeight: () => 3,
    readFlags: () => 0,
    writeTerrain: (row, column, code) => writes.push({ row, column, code }),
    setFlags: (...args) => flagWrites.push(args),
    writeHeight: (...args) => heights.push(args),
    ...overrides,
  });
  return { result, writes, heights, flagWrites };
}
test("feature patches preserve all 24 origins, including original outside-map seeds", () => {
  const a = run(),
    b = run();
  expect(a).toEqual(b);
  expect(a.result.patches).toHaveLength(24);
  expect(a.result.patches[0].code).toBe(18);
  expect(a.result.patches.slice(1).every((p) => p.code === 17)).toBe(true);
  expect(a.result.patches[16].origin.column).toBeGreaterThanOrEqual(54);
  expect(a.writes.some((w) => w.column >= 50)).toBe(true);
  expect(a.heights.every((h) => h[2] === 3)).toBe(true);
});
test("Jurassic Springs overrides code18 and protected tiles still move the brush", () => {
  const a = run({ tableIndex: 2 });
  expect(a.result.patches[0].code).toBe(12);
  const protectedResult = run({ readFlags: () => 0x1000 });
  expect(protectedResult.writes).toHaveLength(0);
  expect(protectedResult.result.patches).toHaveLength(24);
  expect(protectedResult.result.draws).toBeGreaterThan(48);
  expect(
    run({ environment: "desert", readHeight: () => 7 })
      .result.patches.slice(1)
      .every((p) => p.code === 12),
  ).toBe(true);
});
