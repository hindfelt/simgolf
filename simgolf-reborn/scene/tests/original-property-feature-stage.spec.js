import { test, expect } from "@playwright/test";
import { originalPropertyFeatureStage } from "../src/simulation/original-property-feature-stage.js";
const input = {
  slot: 0,
  seed: 1,
  noiseSeed: 1,
  terrainMemory: new Uint8Array(2600),
  initialFlags: new Uint16Array(2500),
};
test("feature composition uses original tile and vertex strides across every normal difficulty", () => {
  for (const difficulty of ["Easy", "Moderate", "Difficult", "Impossible"]) {
    for (let tableIndex = 0; tableIndex < 16; tableIndex++) {
      const result = originalPropertyFeatureStage({
        ...input,
        difficulty,
        tableIndex,
      });
      expect(result.stage).toBe("before-scenery-scatter");
      expect(result.featurePatches).toHaveLength(24);
      expect(result.featurePatches[16].origin.column).toBeGreaterThanOrEqual(
        54,
      );
      expect(result.flags.every((f) => (f & 0x100) === 0)).toBe(true);
      expect(result.terrain.every((t) => t !== 16)).toBe(true);
      expect(result.terrainMemory.slice(50, 2550)).toEqual(result.terrain);
      expect(result.heights.every((h) => h >= 3 && h <= 15)).toBe(true);
    }
  }
  expect(input.terrainMemory.every((t) => t === 0)).toBe(true);
});
test("post-feature cleanup keeps exact deterministic continuation", () => {
  const options = { ...input, difficulty: "Difficult", tableIndex: 2 };
  const first = originalPropertyFeatureStage(options);
  expect(originalPropertyFeatureStage(options)).toEqual(first);
  expect(first.featurePatches.every((p) => p.code !== 18)).toBe(true);
  expect(first.draws).toBeGreaterThan(32);
});
