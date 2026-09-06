import { test, expect } from "@playwright/test";
import {
  originalDifficulty,
  ORIGINAL_DIFFICULTIES,
} from "../src/simulation/original-difficulty.js";
import { originalPropertyStage } from "../src/simulation/original-property-stage.js";
test("original normal difficulties map to decoded height and feature rules", () => {
  expect(ORIGINAL_DIFFICULTIES.map(originalDifficulty)).toEqual([
    {
      code: 0,
      name: "Easy",
      minimumGeneratedHeight: 3,
      featureOverrideBound: null,
    },
    {
      code: 1,
      name: "Moderate",
      minimumGeneratedHeight: 4,
      featureOverrideBound: null,
    },
    {
      code: 2,
      name: "Difficult",
      minimumGeneratedHeight: 4,
      featureOverrideBound: 8,
    },
    {
      code: 3,
      name: "Impossible",
      minimumGeneratedHeight: 4,
      featureOverrideBound: 4,
    },
  ]);
  for (const value of [undefined, "Hard", "Sandbox", 6])
    expect(() => originalDifficulty(value)).toThrow();
});
test("property stage requires named difficulty and preserves the water-level exceptions", () => {
  const args = {
    tableIndex: 6,
    slot: 0,
    seed: 1,
    noiseSeed: 1,
    terrainMemory: new Uint8Array(2600),
    initialFlags: new Uint16Array(2500),
  };
  const easy = originalPropertyStage({ ...args, difficulty: "Easy" });
  const moderate = originalPropertyStage({ ...args, difficulty: "Moderate" });
  expect(easy.heights.some((h) => h === 3)).toBe(true);
  expect(moderate.heights[0]).toBeGreaterThanOrEqual(4);
  expect(moderate.heights[50 * 51]).toBe(3);
  expect(moderate.difficulty).toBe("Moderate");
  expect(() => originalPropertyStage(args)).toThrow();
});
